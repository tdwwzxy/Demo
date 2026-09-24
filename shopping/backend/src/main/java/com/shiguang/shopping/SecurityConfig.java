package com.shiguang.shopping;

import jakarta.servlet.http.HttpServletResponse;
import java.nio.file.*;
import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

@Configuration
public class SecurityConfig {
    @Bean
    UserDetailsService users(@Value("${shop.admin-password}") String configured,
                            @Value("${shop.data-dir}") String dataDir) throws Exception {
        // 首次本地启动生成随机密码，后续复用。部署时通过环境变量提供自己的密码。
        Path file = Path.of(dataDir).toAbsolutePath().normalize().resolve("admin-password.txt");
        String password = configured;
        if (password.isBlank()) {
            Files.createDirectories(file.getParent());
            if (!Files.exists(file)) {
                byte[] random = new byte[18]; new SecureRandom().nextBytes(random);
                Files.writeString(file, Base64.getUrlEncoder().withoutPadding().encodeToString(random), StandardOpenOption.CREATE_NEW);
            }
            password = Files.readString(file).trim();
        }
        if (password.length() < 12) throw new IllegalArgumentException("运营密码至少需要 12 位");
        return new InMemoryUserDetailsManager(User.withUsername("admin")
                .password("{bcrypt}" + new BCryptPasswordEncoder().encode(password)).roles("ADMIN").build());
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http, LoginThrottle throttle) throws Exception {
        http.authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
                .anyRequest().permitAll());
        // React 在写请求前从同源 /api/csrf 取 token；登录、退出、访客下单同样受 CSRF 保护。
        http.csrf(csrf -> csrf.csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()));
        http.formLogin(form -> form.loginProcessingUrl("/api/auth/login")
                .successHandler((request, response, authentication) -> {
                    throttle.clear(request.getRemoteAddr());
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"username\":\"admin\"}");
                })
                .failureHandler((request, response, exception) -> {
                    throttle.failed(request.getRemoteAddr());
                    jsonError(response, 401, "账号或密码不正确");
                }));
        http.logout(logout -> logout.logoutUrl("/api/auth/logout")
                .invalidateHttpSession(true).deleteCookies("JSESSIONID")
                .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)));
        http.exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, exception) -> jsonError(response, 401, "请先登录运营后台"))
                .accessDeniedHandler((request, response, exception) -> jsonError(response, 403, "无权操作或页面会话已更新，请刷新后重试")));
        http.addFilterBefore(throttle, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    static void jsonError(HttpServletResponse response, int status, String message) throws java.io.IOException {
        response.setStatus(status); response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
