package com.shiguang.shopping;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** 单实例的登录失败限流；多实例部署需要改成 Redis 等共享存储。 */
@Component
public class LoginThrottle extends OncePerRequestFilter {
    private record Attempt(int count, long expires) {}
    private final ConcurrentHashMap<String, Attempt> attempts = new ConcurrentHashMap<>();
    void clear(String key) { attempts.remove(key); }
    void failed(String key) {
        long now = System.currentTimeMillis();
        attempts.entrySet().removeIf(entry -> entry.getValue().expires < now);
        attempts.compute(key, (k, old) -> old == null || old.expires < now
                ? new Attempt(1, now + 15 * 60_000) : new Attempt(old.count + 1, old.expires));
    }
    @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        if ("POST".equals(req.getMethod()) && (req.getContextPath()+"/api/auth/login").equals(req.getRequestURI())) {
            Attempt a = attempts.get(req.getRemoteAddr());
            if (a != null && a.count >= 10 && a.expires > System.currentTimeMillis()) {
                SecurityConfig.jsonError(res, 429, "尝试次数过多，请 15 分钟后重试"); return;
            }
        }
        chain.doFilter(req, res);
    }
}
