package com.shiguang.shopping;

import static com.shiguang.shopping.Models.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class ApiController {
    private final CatalogService catalog; private final OrderService orders; private final Path uploads;
    ApiController(CatalogService catalog,OrderService orders,@Value("${shop.data-dir}") String data) {
        this.catalog=catalog;this.orders=orders;uploads=Path.of(data).toAbsolutePath().normalize().resolve("uploads");
    }
    @GetMapping("/csrf") Map<String,String> csrf(CsrfToken token) { return Map.of("token",token.getToken(),"headerName",token.getHeaderName()); }
    @GetMapping("/auth/me") Map<String,String> me(Authentication a) { return Map.of("username",a.getName()); }
    @GetMapping("/products") List<Product> products() { return catalog.products(false); }
    @GetMapping("/products/{id}") Product product(@PathVariable long id) { return catalog.product(id,false); }
    @GetMapping("/store") StoreInput store() { return catalog.store(); }
    @GetMapping("/prices") List<GoldPrice> prices() { return catalog.prices(); }
    @GetMapping("/orders") List<ShopOrder> mine(HttpServletRequest req) { return orders.orders((String)req.getAttribute("guestHash"),false); }
    @PostMapping("/orders") @ResponseStatus(HttpStatus.CREATED)
    ShopOrder create(HttpServletRequest req,@Valid @RequestBody OrderInput input) { return orders.create((String)req.getAttribute("guestHash"),input); }
    @GetMapping("/admin/dashboard") Map<String,Object> dashboard() { return catalog.dashboard(); }
    @GetMapping("/admin/products") List<Product> adminProducts() { return catalog.products(true); }
    @PostMapping("/admin/products") @ResponseStatus(HttpStatus.CREATED)
    Product add(@Valid @RequestBody ProductInput input) { return catalog.save(null,input); }
    @PutMapping("/admin/products/{id}") Product update(@PathVariable long id,@Valid @RequestBody ProductInput input) { return catalog.save(id,input); }
    @PutMapping("/admin/prices/{material}") void gold(@PathVariable String material,@Valid @RequestBody GoldInput input) { catalog.price(material,input); }
    @PutMapping("/admin/store") void store(@Valid @RequestBody StoreInput input) { catalog.store(input); }
    @GetMapping("/admin/orders") List<ShopOrder> allOrders() { return orders.orders(null,true); }
    @PutMapping("/admin/orders/{id}/status") void status(@PathVariable String id,@Valid @RequestBody StatusInput input) { orders.status(id,input.status()); }

    @PostMapping(value="/admin/prices/import",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    Map<String,Integer> importPrices(@RequestParam MultipartFile file) throws IOException {
        if(file.isEmpty()||file.getSize()>512*1024) CatalogService.bad("CSV 文件应为 1 字节至 512 KB");
        return Map.of("updated",catalog.importPrices(new String(file.getBytes(),StandardCharsets.UTF_8)));
    }
    @GetMapping(value="/admin/prices/template",produces="text/csv;charset=UTF-8")
    ResponseEntity<String> template() {
        return ResponseEntity.ok().header("Content-Disposition","attachment; filename=prices-template.csv")
                .body("\uFEFFsku,price,stock\nBFWJZ10049,2526.81,7\nBFWJZ10050,2066.46,10\n");
    }
    @PostMapping(value="/admin/uploads",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    Map<String,String> upload(@RequestParam MultipartFile file) throws IOException {
        if(file.isEmpty()||file.getSize()>5*1024*1024) CatalogService.bad("图片大小需要在 1 字节至 5 MB 之间");
        // 不信任后缀或 MIME：先读取图片头并限制像素，再解码重写，去掉附带元数据。
        try(var input=ImageIO.createImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
            var readers=ImageIO.getImageReaders(input);
            if(!readers.hasNext()) { CatalogService.bad("仅支持真实 JPEG 或 PNG 图片"); }
            var reader=readers.next();
            try {
                reader.setInput(input,true,true); String format=reader.getFormatName().toLowerCase(Locale.ROOT);
                if(!Set.of("png","jpeg","jpg").contains(format)) CatalogService.bad("仅支持 JPEG 或 PNG");
                if(reader.getWidth(0)>6000||reader.getHeight(0)>6000||(long)reader.getWidth(0)*reader.getHeight(0)>20_000_000) CatalogService.bad("图片尺寸太大，请控制在 2000 万像素内且长宽不超过 6000");
                BufferedImage image=reader.read(0); String extension=format.equals("png")?"png":"jpg";
                String name=UUID.randomUUID()+"."+extension;
                if(!ImageIO.write(image,extension,uploads.resolve(name).toFile())) throw new IOException("图片编码失败");
                catalog.audit("图片上传",name);
                return Map.of("imageUrl","/uploads/"+name);
            } catch (javax.imageio.IIOException invalid) {
                throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,"图片数据不完整或已损坏，请重新选择图片");
            } finally { reader.dispose(); }
        }
    }
}
