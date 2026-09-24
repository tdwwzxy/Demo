package local.research;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api")
public class ReportController {
    private final ReportService service;
    private final ObjectMapper mapper;
    public ReportController(ReportService service,ObjectMapper mapper){this.service=service;this.mapper=mapper;}
    @GetMapping("/report") public Map<String,Object> report(){return service.snapshot().manifest();}
    @GetMapping("/series") public Object series(@RequestParam(defaultValue="2024-01-01") LocalDate from,
            @RequestParam(defaultValue="9999-12-31") LocalDate to){
        if(from.isAfter(to))throw new IllegalArgumentException("from must not be after to");
        return service.snapshot().points().stream().filter(p->!p.date().isBefore(from)&&!p.date().isAfter(to)&&p.normalized()!=null).toList();
    }
    @GetMapping("/data") public Object data(@RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="25") int size,@RequestParam(defaultValue="1900-01-01") LocalDate from,
            @RequestParam(defaultValue="9999-12-31") LocalDate to){
        if(page<0||size<1||size>500||from.isAfter(to))throw new IllegalArgumentException("Invalid pagination/date range");
        var rows=service.snapshot().points().reversed().stream().filter(p->!p.date().isBefore(from)&&!p.date().isAfter(to)).toList();
        return Map.of("total",rows.size(),"page",page,"size",size,"rows",rows.stream().skip((long)page*size).limit(size).toList());
    }
    @PostMapping("/report/regenerate") public Object regenerate() throws IOException {return service.regenerate();}
    @PostMapping(value="/data/import",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public Object importData(@RequestParam("file") MultipartFile file) throws IOException {return service.importData(file.getBytes());}
    @GetMapping(value="/report.png",produces=MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> png(){return file(service.snapshot().png(),"report-4883x2900.png",MediaType.IMAGE_PNG,false);}
    @GetMapping("/data.csv") public ResponseEntity<byte[]> csv(){return file(service.snapshot().csv(),"zn-normalized.csv",MediaType.parseMediaType("text/csv;charset=UTF-8"),true);}
    @GetMapping("/manifest.json") public ResponseEntity<byte[]> manifest() throws IOException {
        return file(mapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(service.snapshot().manifest()),"manifest.json",MediaType.APPLICATION_JSON,true);
    }
    @GetMapping("/raw/{name}") public ResponseEntity<byte[]> raw(@PathVariable String name) throws IOException {
        return file(service.raw(name),name,MediaType.APPLICATION_JSON,false);
    }
    private ResponseEntity<byte[]> file(byte[] bytes,String name,MediaType type,boolean attachment){
        return ResponseEntity.ok().contentType(type).cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION,(attachment?"attachment":"inline")+"; filename=\""+name+"\"").body(bytes);
    }
    @ExceptionHandler(IllegalArgumentException.class) @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Object badInput(IllegalArgumentException ex){return Map.of("error",ex.getMessage());}
}

@Component
class LocalWriteFilter extends OncePerRequestFilter {
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
        // Only this local UI (or an explicit local API client) may trigger imports/regeneration.
        if(req.getMethod().equals("POST")) {
            String origin=req.getHeader("Origin");
            String expected=req.getScheme()+"://"+req.getHeader("Host");
            if(!"local-report".equals(req.getHeader("X-Report-Client")) || (origin!=null&&!origin.equals(expected))) {
                res.sendError(403,"Local report client required");return;
            }
        }
        res.setHeader("X-Content-Type-Options","nosniff");
        res.setHeader("Cache-Control","no-store");
        chain.doFilter(req,res);
    }
}
