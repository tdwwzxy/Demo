package com.shiguang.shopping;

import java.nio.file.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final String location;
    WebConfig(@Value("${shop.data-dir}") String data) throws java.io.IOException {
        Path dir=Path.of(data).toAbsolutePath().normalize().resolve("uploads"); Files.createDirectories(dir);
        location=dir.toUri().toString();
    }
    @Override public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**").addResourceLocations(location).setCachePeriod(86400);
    }
}
