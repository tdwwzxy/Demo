package com.shiguang.shopping;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiguang.shopping.Models.ProductInput;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SeedData implements CommandLineRunner {
    private final JdbcTemplate db; private final ObjectMapper mapper;
    SeedData(JdbcTemplate db,ObjectMapper mapper) { this.db=db;this.mapper=mapper; }
    @Override @Transactional public void run(String... args) throws Exception {
        // 只在空数据库中导入示例，不会在每次启动时覆盖运营人员修改的数据。
        if(db.queryForObject("SELECT COUNT(*) FROM products",Integer.class)==0) {
            try(var source=new ClassPathResource("seed-products.json").getInputStream()) {
                List<ProductInput> products=mapper.readValue(source,new TypeReference<>() {});
                int id=1;
                for(var p:products) db.update("INSERT INTO products(id,sku,name,category,material,price,weight_min,weight_max,labor_fee,stock,image_url,image_crop,description,featured,fresh,active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",id++,p.sku(),p.name(),p.category(),p.material(),p.price(),p.weightMin(),p.weightMax(),p.laborFee(),p.stock(),p.imageUrl(),p.imageCrop(),p.description(),p.featured(),p.fresh(),p.active());
            }
        }
        if(db.queryForObject("SELECT COUNT(*) FROM store_settings",Integer.class)==0)
            db.update("INSERT INTO store_settings VALUES(1,?,?,?,?,?)","拾光珠宝","把日常，戴成珍藏。","","","演示商城：商品与报价仅供功能体验，订单由商家线下联系确认，不在线扣款。");
        if(db.queryForObject("SELECT COUNT(*) FROM gold_prices",Integer.class)==0) {
            for(String material:List.of("足金","足金999","足金999.9","足金999.99","投资金条","工艺金条","18K金","铂金999")) {
                BigDecimal price=new BigDecimal(material.equals("18K金")?"756.30":material.equals("铂金999")?"440.60":"998.80");
                db.update("INSERT INTO gold_prices(material,price,source,updated_at) VALUES(?,?,?,'2026-09-24 00:00:00')",material,price,"截图演示参考价，非实时行情");
            }
        }
    }
}
