package local.research;

import com.fasterxml.jackson.databind.*;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import static local.research.MarketData.*;

@Service
public class ReportService {
    private final Path dataDir, output;
    private final ObjectMapper mapper;
    private final ChartRenderer renderer;
    private volatile Snapshot current;
    public record Snapshot(Map<String,Object> manifest, List<Point> points, byte[] png, byte[] csv) {}
    record SourceFile(String name, String sha256, int rows, String retrievedAt) {}
    record Loaded(List<Bar> bars, List<SourceFile> sources, Instant retrievedAt) {}

    public ReportService(@Value("${report.data-dir}") String dataDir,
                         @Value("${report.output-path}") String output,
                         ObjectMapper mapper, ChartRenderer renderer) {
        this.dataDir=Path.of(dataDir).toAbsolutePath().normalize();
        this.output=Path.of(output).toAbsolutePath().normalize();
        this.mapper=mapper; this.renderer=renderer;
    }
    @PostConstruct public void initialize() throws IOException { regenerate(); }
    public Snapshot snapshot() { return current; }

    private JsonNode unwrap(JsonNode node) {
        // Accept the saved provenance envelope, not arbitrary data with an unknown symbol.
        if (!node.path("request").path("symbol").asText().equals("US.ZNmain") ||
            !node.path("request").path("ktype").asText().equals("2") ||
            !node.path("request").path("autype").asText().equals("0"))
            throw new IllegalArgumentException("Expected US.ZNmain daily data with autype=0");
        JsonNode response=node.path("response");
        if (response.path("ret_code").asInt(-1)!=0 || response.path("pagination").path("has_more").asBoolean(false))
            throw new IllegalArgumentException("Failed or incomplete Futu response");
        if (!response.path("data").path("kline_list").isArray())
            throw new IllegalArgumentException("Missing kline_list");
        return response.path("data").path("kline_list");
    }
    List<Bar> parse(JsonNode envelope) {
        List<Bar> bars=new ArrayList<>();
        for(JsonNode b:unwrap(envelope)) {
            LocalDate date=LocalDate.parse(b.path("date").asText(),DateTimeFormatter.BASIC_ISO_DATE);
            if(date.isAfter(LocalDate.now(ZoneId.of("America/Chicago"))))
                throw new IllegalArgumentException("Future-dated candle: "+date);
            for(String key:List.of("open","high","low","close"))
                if(!b.path(key).isNumber()) throw new IllegalArgumentException("Missing numeric "+key+" at "+date);
            Double settle=b.path("settle_price").isNumber() && b.path("settle_price").asDouble()>0
                    ?b.path("settle_price").asDouble():null;
            bars.add(new Bar(date,b.get("open").asDouble(),b.get("high").asDouble(),b.get("low").asDouble(),
                    b.get("close").asDouble(),settle,b.path("volume").asLong(),b.path("open_interest").asLong()));
        }
        if(bars.isEmpty()) throw new IllegalArgumentException("Empty data response");
        bars.sort(Comparator.comparing(Bar::date));
        calculate(bars); // Enforce OHLC and uniqueness even on short import batches.
        Instant.parse(envelope.path("retrievedAt").asText());
        return bars;
    }
    private Loaded load(Path extra) throws IOException {
        List<Path> files;
        Files.createDirectories(dataDir.resolve("raw"));
        try(var stream=Files.list(dataDir.resolve("raw"))) {
            files=new ArrayList<>(stream.filter(p->p.getFileName().toString().endsWith(".json")).sorted().toList());
        }
        if(extra!=null) files.add(extra);
        TreeMap<LocalDate,Bar> merged=new TreeMap<>();
        Map<LocalDate,Instant> versions=new HashMap<>();
        List<SourceFile> sources=new ArrayList<>();
        Instant newest=Instant.EPOCH;
        for(Path path:files) {
            byte[] bytes=Files.readAllBytes(path);
            JsonNode root=mapper.readTree(bytes);
            List<Bar> bars=parse(root);
            Instant at=Instant.parse(root.path("retrievedAt").asText());
            if(at.isAfter(newest))newest=at;
            for(Bar b:bars) if(!at.isBefore(versions.getOrDefault(b.date(),Instant.EPOCH))) {
                merged.put(b.date(),b); versions.put(b.date(),at);
            }
            sources.add(new SourceFile(path.getFileName().toString(),sha(bytes),bars.size(),at.toString()));
        }
        if(merged.size()<WINDOW) throw new IllegalArgumentException("At least 756 trading records are required");
        return new Loaded(List.copyOf(merged.values()),List.copyOf(sources),newest);
    }
    public synchronized Map<String,Object> importData(byte[] bytes) throws IOException {
        if(bytes.length>10_000_000)throw new IllegalArgumentException("Import too large");
        JsonNode envelope=mapper.readTree(bytes);
        parse(envelope);
        Path pending=Files.createTempFile(dataDir,"import-",".pending");
        try {
            Files.write(pending,bytes);
            calculate(load(pending).bars());
            Files.move(pending,dataDir.resolve("raw/import-"+UUID.randomUUID()+".json"));
        } finally { Files.deleteIfExists(pending); }
        return regenerate();
    }
    public synchronized Map<String,Object> regenerate() throws IOException {
        Loaded loaded=load(null);
        List<Point> points=calculate(loaded.bars());
        Point last=points.getLast();
        Instant generated=Instant.now();
        List<Point> valid=points.stream().filter(p->p.normalized()!=null).toList();
        byte[] png=renderer.render(valid,generated);
        byte[] csv=csv(points);
        String id=DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss").withZone(ZoneOffset.UTC).format(generated)
                +"-"+UUID.randomUUID().toString().substring(0,8);
        LinkedHashMap<String,Object> meta=new LinkedHashMap<>();
        meta.put("id",id);meta.put("symbol","US.ZNmain");meta.put("source","Futu MCP · quote_history_kline");
        meta.put("priceField","close");meta.put("adjustment","autype=0 · supplier main continuous contract");
        meta.put("method","close / SMA(close, 756 sessions), including current session");
        meta.put("window",WINDOW);meta.put("firstDate",points.getFirst().date());
        meta.put("firstNormalizedDate",valid.getFirst().date());meta.put("latestDate",last.date());
        meta.put("totalRows",points.size());meta.put("normalizedRows",valid.size());meta.put("latest",last);
        meta.put("retrievedAt",loaded.retrievedAt());meta.put("generatedAt",generated);
        meta.put("calendarAgeDays",ChronoUnit.DAYS.between(last.date(),LocalDate.now(ZoneId.of("America/Chicago"))));
        meta.put("width",ChartRenderer.WIDTH);meta.put("height",ChartRenderer.HEIGHT);
        meta.put("outputPath",output.toString());meta.put("pngSha256",sha(png));meta.put("csvSha256",sha(csv));
        meta.put("bands",BANDS);meta.put("sources",loaded.sources());
        meta.put("missingSettlementRows",points.stream().filter(p->p.settle()==null).count());
        meta.put("notes",List.of("756 个交易日是三年的近似；以收盘价统一计算，缺少的结算价不回填。",
                "沿用富途主连与 autype=0 口径；供应商底层换月算法未经独立复核。",
                "阴影为真实日内 high/low 除以同一均线；这是一种明确实现，不代表已确认原作者算法。",
                "水平区域来自参考图，不代表统计置信区间或价格预测。",
                "重新生成只读取本地数据。新的行情需导入富途 MCP 数据；生成时间不等于行情更新时间。"));
        Path check=dataDir.resolve("latest-check.json");
        if(Files.isRegularFile(check)) {
            JsonNode root=mapper.readTree(check.toFile());
            meta.put("latestProviderCheck",root);
        }
        Path archive=dataDir.resolve("reports").resolve(id);
        Files.createDirectories(archive);
        Files.write(archive.resolve("report.png"),png);
        Files.write(archive.resolve("data.csv"),csv);
        mapper.writerWithDefaultPrettyPrinter().writeValue(archive.resolve("manifest.json").toFile(),meta);
        // Publish complete files, then swap the in-memory snapshot. Readers never see a partly rendered PNG.
        atomicWrite(output,png);
        atomicWrite(dataDir.resolve("report.png"),png);
        atomicWrite(dataDir.resolve("normalized.csv"),csv);
        atomicWrite(dataDir.resolve("manifest.json"),mapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(meta));
        current=new Snapshot(Collections.unmodifiableMap(meta),points,png,csv);
        return current.manifest();
    }
    private void atomicWrite(Path path, byte[] bytes) throws IOException {
        Files.createDirectories(path.getParent());
        Path temp=Files.createTempFile(path.getParent(),"report-",".tmp");
        try {
            Files.write(temp,bytes);
            try{Files.move(temp,path,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}
            catch(AtomicMoveNotSupportedException ex){Files.move(temp,path,StandardCopyOption.REPLACE_EXISTING);}
        } finally { Files.deleteIfExists(temp); }
    }
    public byte[] raw(String name) throws IOException {
        if(!name.matches("[a-zA-Z0-9_-]+\\.json"))throw new IllegalArgumentException("Invalid file name");
        Path path=dataDir.resolve("raw").resolve(name).normalize();
        if(!path.getParent().equals(dataDir.resolve("raw")) || !Files.isRegularFile(path))
            throw new IllegalArgumentException("Unknown raw file");
        return Files.readAllBytes(path);
    }
    static String sha(byte[] bytes) {
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}
        catch(Exception e){throw new IllegalStateException(e);}
    }
    private static byte[] csv(List<Point> rows) {
        StringBuilder s=new StringBuilder("date,open,high,low,close,settle,volume,open_interest,ma_3y,normalized,deviation_pct,normalized_low,normalized_high\n");
        for(Point p:rows) s.append(p.date()).append(',').append(p.open()).append(',').append(p.high()).append(',')
                .append(p.low()).append(',').append(p.close()).append(',').append(value(p.settle())).append(',')
                .append(p.volume()).append(',').append(p.openInterest()).append(',').append(value(p.ma3y())).append(',')
                .append(value(p.normalized())).append(',').append(value(p.deviationPct())).append(',')
                .append(value(p.normalizedLow())).append(',').append(value(p.normalizedHigh())).append('\n');
        return s.toString().getBytes(StandardCharsets.UTF_8);
    }
    private static String value(Double d){return d==null?"":Double.toString(d);}
}
