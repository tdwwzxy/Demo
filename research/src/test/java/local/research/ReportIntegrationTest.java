package local.research;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import com.fasterxml.jackson.databind.JsonNode;
import javax.imageio.ImageIO;
import java.io.*;
import java.nio.file.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
class ReportIntegrationTest {
    static final Path TEMP;
    static {
        try {
            TEMP=Files.createTempDirectory("treasury-test-");Files.createDirectories(TEMP.resolve("raw"));
            try(var stream=Files.list(Path.of("data/raw"))){for(Path p:stream.toList())Files.copy(p,TEMP.resolve("raw").resolve(p.getFileName()));}
        }catch(IOException e){throw new UncheckedIOException(e);}
    }
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r){
        r.add("report.data-dir",TEMP::toString);r.add("report.output-path",()->TEMP.resolve("output.png").toString());
    }
    @Autowired TestRestTemplate http;
    @Autowired ReportService service;
    @Test void realHistoryGeneratesExactSizePngAndCsv() throws Exception {
        var response=http.getForEntity("/api/report.png",byte[].class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        var image=ImageIO.read(new ByteArrayInputStream(response.getBody()));
        assertThat(image.getWidth()).isEqualTo(4883);assertThat(image.getHeight()).isEqualTo(2900);
        assertThat(Files.readAllBytes(TEMP.resolve("output.png"))).isEqualTo(response.getBody());
        assertThat(http.getForObject("/api/data.csv",String.class)).startsWith("date,open,high,low,close,settle");
        assertThat(http.getForObject("/",String.class)).contains("/app.js");
    }
    @Test void latestMeanMatchesIndependentDirectSummation(){
        var points=service.snapshot().points();
        double expected=points.subList(points.size()-756,points.size()).stream().mapToDouble(MarketData.Point::close).average().orElseThrow();
        assertThat(points.getLast().ma3y()).isCloseTo(expected,within(1e-10));
        assertThat(points.getLast().normalized()).isCloseTo(points.getLast().close()/expected,within(1e-12));
    }
    @Test void paginationFiltersAndBadInputsAreHandled(){
        var result=http.getForObject("/api/data?page=0&size=2&from=2026-09-10&to=2026-09-11",JsonNode.class);
        assertThat(result.path("total").asInt()).isEqualTo(2);
        assertThat(result.path("rows").get(0).path("date").asText()).isEqualTo("2026-09-11");
        assertThat(http.getForEntity("/api/data?size=501",String.class).getStatusCode().value()).isEqualTo(400);
        assertThat(http.getForEntity("/api/series?from=2026-01-01&to=2024-01-01",String.class).getStatusCode().value()).isEqualTo(400);
        assertThat(http.postForEntity("/api/report/regenerate",null,String.class).getStatusCode().value()).isEqualTo(403);
    }
    @Test void invalidImportCannotReplaceExistingReport(){
        var before=service.snapshot();
        assertThatThrownBy(()->service.importData("{}".getBytes())).isInstanceOf(IllegalArgumentException.class);
        assertThat(service.snapshot()).isSameAs(before);
    }
}
