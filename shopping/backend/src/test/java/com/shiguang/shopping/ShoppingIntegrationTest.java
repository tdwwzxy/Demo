package com.shiguang.shopping;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static com.shiguang.shopping.Models.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

/** 使用真实 H2、事务与安全过滤器验证业务边界，不接触本地商城的数据文件。 */
@SpringBootTest(properties={
    "spring.datasource.url=jdbc:h2:mem:shopping-test;DB_CLOSE_DELAY=-1",
    "shop.data-dir=target/test-data", "shop.admin-password=Test-only-password-2026"
})
@AutoConfigureMockMvc
class ShoppingIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;
    @Autowired OrderService orders;
    @Autowired CatalogService catalog;
    private final Cookie owner = new Cookie("SHOP_GUEST", "A".repeat(43));

    @BeforeEach void reset() {
        db.update("DELETE FROM order_items"); db.update("DELETE FROM shop_orders");
        db.update("DELETE FROM audit_log"); db.update("DELETE FROM products WHERE id>=100");
        db.update("UPDATE products SET price=2526.81,stock=7,active=TRUE WHERE id=1");
        db.update("UPDATE products SET price=2066.46,stock=10,active=TRUE WHERE id=2");
    }
    private String input(int quantity) throws Exception {
        // 故意提交伪造单价与总价，服务端应该完全忽略这些未知字段。
        return json.writeValueAsString(Map.of("customerName","测试访客","phone","13800000000",
            "address","测试市测试区测试街道 1 号","note","集成测试",
            "total",0.01,"items",List.of(Map.of("productId",1,"quantity",quantity,"price",0.01))));
    }
    private String create(int quantity) throws Exception {
        var result=mvc.perform(post("/api/orders").cookie(owner).with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content(input(quantity)))
            .andExpect(status().isCreated()).andReturn();
        return json.readTree(result.getResponse().getContentAsString()).get("id").asText();
    }
    private MockMultipartFile csv(String value) {
        return new MockMultipartFile("file","prices.csv","text/csv",value.getBytes(StandardCharsets.UTF_8));
    }

    @Test void publicBrowseButAdminAndWritesAreProtected() throws Exception {
        mvc.perform(get("/api/products")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(14));
        mvc.perform(get("/api/admin/products")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/products").with(user("visitor").roles("USER"))).andExpect(status().isForbidden());
        mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content(input(1))).andExpect(status().isForbidden());
        mvc.perform(multipart("/api/admin/prices/import").file(csv("sku,price,stock\nBFWJZ10049,1,7"))
            .with(csrf())).andExpect(status().isUnauthorized());
    }

    @Test void realLoginRotatesCsrfAndLogoutRevokesAccess() throws Exception {
        var tokenResult=mvc.perform(get("/api/csrf")).andExpect(status().isOk()).andReturn();
        var token=json.readTree(tokenResult.getResponse().getContentAsString());
        var session=(MockHttpSession)tokenResult.getRequest().getSession(false);
        mvc.perform(post("/api/auth/login").session(session).header(token.get("headerName").asText(),token.get("token").asText())
            .param("username","admin").param("password","Test-only-password-2026"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.username").value("admin"));
        mvc.perform(get("/api/admin/dashboard").session(session)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/logout").session(session).header(token.get("headerName").asText(),token.get("token").asText()))
            .andExpect(status().isForbidden()); // 登录后旧 CSRF token 已失效。
        mvc.perform(post("/api/auth/logout").session(session).with(csrf())).andExpect(status().isNoContent());
        assertThat(session.isInvalid()).isTrue();
        mvc.perform(get("/api/admin/dashboard")).andExpect(status().isUnauthorized());
    }

    @Test void failedPasswordsAreThrottled() throws Exception {
        for(int i=0;i<10;i++) mvc.perform(post("/api/auth/login").with(csrf())
            .with(req->{req.setRemoteAddr("192.0.2.50");return req;}).param("username","admin").param("password","wrong"))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").with(csrf()).with(req->{req.setRemoteAddr("192.0.2.50");return req;})
            .param("username","admin").param("password","wrong")).andExpect(status().isTooManyRequests());
    }

    @Test void orderUsesServerPriceAndIsPrivateToGuest() throws Exception {
        String id=create(2);
        mvc.perform(get("/api/orders").cookie(owner)).andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(id)).andExpect(jsonPath("$[0].total").value(5053.62));
        mvc.perform(get("/api/orders").cookie(new Cookie("SHOP_GUEST","B".repeat(43))))
            .andExpect(jsonPath("$.length()").value(0));
        assertThat(catalog.product(1,true).stock()).isEqualTo(5);
    }

    @Test void invalidQuantityAndNullLineDoNotCreateOrders() throws Exception {
        mvc.perform(post("/api/orders").cookie(owner).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(input(0)))
            .andExpect(status().isBadRequest());
        String nullLine=input(1).replaceAll("\\[\\{[^]]+}]","[null]");
        mvc.perform(post("/api/orders").cookie(owner).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(nullLine))
            .andExpect(status().isBadRequest());
        assertThat(db.queryForObject("SELECT COUNT(*) FROM shop_orders",Integer.class)).isZero();
    }

    @Test void insufficientStockRollsBackAllLines() throws Exception {
        var order=new OrderInput("测试","13800000000","测试地址至少五个字","",
            List.of(new OrderLineInput(1,2),new OrderLineInput(2,99)));
        assertThatThrownBy(()->orders.create("owner",order)).isInstanceOf(ResponseStatusException.class);
        assertThat(catalog.product(1,true).stock()).isEqualTo(7);
        assertThat(db.queryForObject("SELECT COUNT(*) FROM shop_orders",Integer.class)).isZero();
    }

    @Test void concurrentCustomersCannotBuyTheSameLastItem() throws Exception {
        db.update("UPDATE products SET stock=1 WHERE id=1");
        var start=new CountDownLatch(1);
        var request=new OrderInput("测试","13800000000","测试地址至少五个字","",List.of(new OrderLineInput(1,1)));
        try(var pool=Executors.newFixedThreadPool(2)) {
            Callable<Boolean> attempt=()->{start.await();try{orders.create(UUID.randomUUID().toString(),request);return true;}
                catch(ResponseStatusException e){assertThat(e.getStatusCode().value()).isEqualTo(409);return false;}};
            var first=pool.submit(attempt);var second=pool.submit(attempt);start.countDown();
            assertThat(List.of(first.get(10,TimeUnit.SECONDS),second.get(10,TimeUnit.SECONDS)))
                .containsExactlyInAnyOrder(true,false);
        }
        assertThat(catalog.product(1,true).stock()).isZero();
        assertThat(db.queryForObject("SELECT COUNT(*) FROM shop_orders",Integer.class)).isEqualTo(1);
    }

    @Test void cancellationRestoresInventoryOnlyOnce() throws Exception {
        String id=create(2);
        mvc.perform(put("/api/admin/orders/{id}/status",id).with(user("admin").roles("ADMIN")).with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CANCELLED\"}")).andExpect(status().isOk());
        assertThat(catalog.product(1,true).stock()).isEqualTo(7);
        mvc.perform(put("/api/admin/orders/{id}/status",id).with(user("admin").roles("ADMIN")).with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CANCELLED\"}")).andExpect(status().isConflict());
        assertThat(catalog.product(1,true).stock()).isEqualTo(7);
    }

    @Test void completedOrdersKeepPriceSnapshotAndCannotBeCancelled() throws Exception {
        String id=create(1);db.update("UPDATE products SET price=100 WHERE id=1");
        orders.status(id,"CONFIRMED");orders.status(id,"COMPLETED");
        assertThat(orders.orders(null,true).getFirst().total()).isEqualByComparingTo("2526.81");
        assertThatThrownBy(()->orders.status(id,"CANCELLED")).isInstanceOf(ResponseStatusException.class);
    }

    @Test void csvIsAtomicAndSupportsUtf8Bom() throws Exception {
        mvc.perform(multipart("/api/admin/prices/import").file(csv("sku,price,stock\nBFWJZ10049,100.01,8\nNOT_FOUND,2,3"))
            .with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isBadRequest());
        assertThat(catalog.product(1,true).price()).isEqualByComparingTo("2526.81");
        mvc.perform(multipart("/api/admin/prices/import").file(csv("\uFEFFsku,price,stock\nBFWJZ10049,100.01,8\nBFWJZ10050,200,9"))
            .with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isOk()).andExpect(jsonPath("$.updated").value(2));
        assertThat(catalog.product(1,true).price()).isEqualByComparingTo("100.01");
        assertThat(catalog.product(2,true).stock()).isEqualTo(9);
    }

    @Test void productValidationAndOffShelfApplyToPublicApi() throws Exception {
        var payload=json.valueToTree(catalog.product(1,true));
        ((com.fasterxml.jackson.databind.node.ObjectNode)payload).put("price",-1);
        mvc.perform(put("/api/admin/products/1").with(user("admin").roles("ADMIN")).with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload))).andExpect(status().isBadRequest());
        ((com.fasterxml.jackson.databind.node.ObjectNode)payload).put("price",2526.81).put("active",false);
        mvc.perform(put("/api/admin/products/1").with(user("admin").roles("ADMIN")).with(csrf())
            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(payload))).andExpect(status().isOk());
        mvc.perform(get("/api/products/1")).andExpect(status().isNotFound());
        mvc.perform(post("/api/orders").cookie(owner).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(input(1)))
            .andExpect(status().isConflict());
    }

    @Test void uploadsInspectBytesInsteadOfTrustingFileName() throws Exception {
        mvc.perform(multipart("/api/admin/uploads").file(new MockMultipartFile("file","fake.png","image/png","<script>alert(1)</script>".getBytes()))
            .with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isBadRequest());
        var bytes=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(20,20,BufferedImage.TYPE_INT_RGB),"png",bytes);
        byte[] truncated=Arrays.copyOf(bytes.toByteArray(),24);
        mvc.perform(multipart("/api/admin/uploads").file(new MockMultipartFile("file","broken.png","image/png",truncated))
            .with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isBadRequest());
        var response=mvc.perform(multipart("/api/admin/uploads").file(new MockMultipartFile("file","../../photo.png","image/png",bytes.toByteArray()))
            .with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isOk()).andReturn();
        String url=json.readTree(response.getResponse().getContentAsString()).get("imageUrl").asText();
        assertThat(url).matches("/uploads/[a-f0-9-]{36}\\.png");
        mvc.perform(get(url)).andExpect(status().isOk()).andExpect(content().contentType(MediaType.IMAGE_PNG));
    }
}
