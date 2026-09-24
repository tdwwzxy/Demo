package local.research;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class FuturesApplication {
    public static void main(String[] args) {
        System.setProperty("java.awt.headless", "true");
        // Some Windows launchers supply an 8.3 TEMP path that breaks JDK AF_UNIX selector pipes.
        // Use the existing project directory for this JVM only; no system settings are changed.
        if (System.getProperty("os.name").startsWith("Windows") && System.getProperty("jdk.net.unixdomain.tmpdir")==null)
            System.setProperty("jdk.net.unixdomain.tmpdir",java.nio.file.Path.of(".").toAbsolutePath().normalize().toString());
        SpringApplication.run(FuturesApplication.class, args);
    }
}
