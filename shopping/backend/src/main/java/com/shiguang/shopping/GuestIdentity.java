package com.shiguang.shopping;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** 免登录不等于订单公开：用高随机性的 HttpOnly Cookie 标识本浏览器的访客。 */
@Component
public class GuestIdentity extends OncePerRequestFilter {
    @Value("${shop.secure-cookie}") private boolean secure;
    @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        if (req.getRequestURI().startsWith("/api/")) {
            String key = req.getCookies() == null ? null : Arrays.stream(req.getCookies())
                    .filter(c -> "SHOP_GUEST".equals(c.getName())).map(Cookie::getValue).findFirst().orElse(null);
            if (key == null || !key.matches("[A-Za-z0-9_-]{43}")) {
                byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
                key = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
                res.addHeader("Set-Cookie", ResponseCookie.from("SHOP_GUEST", key).httpOnly(true)
                        .secure(secure).sameSite("Lax").path("/").maxAge(365L * 86400).build().toString());
            }
            try {
                req.setAttribute("guestHash", HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                        .digest(key.getBytes(StandardCharsets.UTF_8))));
            } catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
        }
        chain.doFilter(req, res);
    }
}
