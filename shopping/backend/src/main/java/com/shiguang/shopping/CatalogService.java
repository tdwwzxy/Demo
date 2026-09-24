package com.shiguang.shopping;

import static com.shiguang.shopping.Models.*;
import java.math.BigDecimal;
import java.nio.file.*;
import java.util.*;
import org.apache.commons.csv.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CatalogService {
    public static final List<String> CATEGORIES = List.of("戒指", "手镯", "手链", "项链", "吊坠", "耳饰", "手串配件", "礼品");
    private final JdbcTemplate db;
    private final Path uploads;
    CatalogService(JdbcTemplate db, @Value("${shop.data-dir}") String data) {
        this.db = db; uploads = Path.of(data).toAbsolutePath().normalize().resolve("uploads");
    }
    static final RowMapper<Product> PRODUCT = (r, i) -> new Product(r.getLong("id"), r.getString("sku"),
            r.getString("name"), r.getString("category"), r.getString("material"), r.getBigDecimal("price"),
            r.getBigDecimal("weight_min"), r.getBigDecimal("weight_max"), r.getBigDecimal("labor_fee"),
            r.getInt("stock"), r.getString("image_url"), r.getString("image_crop"), r.getString("description"),
            r.getBoolean("featured"), r.getBoolean("fresh"), r.getBoolean("active"), r.getTimestamp("updated_at").toInstant().toString());

    public List<Product> products(boolean admin) {
        return db.query("SELECT * FROM products " + (admin ? "" : "WHERE active=TRUE ") + "ORDER BY id DESC", PRODUCT);
    }
    public Product product(long id, boolean admin) {
        return db.query("SELECT * FROM products WHERE id=?" + (admin ? "" : " AND active=TRUE"), PRODUCT, id)
                .stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "商品不存在或已下架"));
    }
    @Transactional
    public Product save(Long id, ProductInput p) {
        if (!CATEGORIES.contains(p.category())) bad("请选择已有商品分类");
        if (p.weightMax().compareTo(p.weightMin()) < 0) bad("最大克重不能小于最小克重");
        validateImage(p.imageUrl(), p.imageCrop());
        if (id == null) {
            db.update("INSERT INTO products(sku,name,category,material,price,weight_min,weight_max,labor_fee,stock,image_url,image_crop,description,featured,fresh,active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    p.sku(), p.name(), p.category(), p.material(), p.price(), p.weightMin(), p.weightMax(), p.laborFee(), p.stock(), p.imageUrl(), p.imageCrop(), p.description(), p.featured(), p.fresh(), p.active());
            id = db.queryForObject("SELECT id FROM products WHERE sku=?", Long.class, p.sku());
        } else {
            product(id, true);
            db.update("UPDATE products SET sku=?,name=?,category=?,material=?,price=?,weight_min=?,weight_max=?,labor_fee=?,stock=?,image_url=?,image_crop=?,description=?,featured=?,fresh=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
                    p.sku(), p.name(), p.category(), p.material(), p.price(), p.weightMin(), p.weightMax(), p.laborFee(), p.stock(), p.imageUrl(), p.imageCrop(), p.description(), p.featured(), p.fresh(), p.active(), id);
        }
        audit("商品保存", p.sku() + " / 价格 " + p.price() + " / 库存 " + p.stock());
        return product(id, true);
    }
    private void validateImage(String url, String crop) {
        if (url.matches("/uploads/[a-f0-9-]{36}\\.(png|jpg)")) {
            if (!Files.isRegularFile(uploads.resolve(url.substring("/uploads/".length()))) || !crop.isEmpty()) bad("上传图片不存在或裁剪参数不正确");
        } else {
            Map<String,String> allowed = Map.ofEntries(
                Map.entry("leaf","/reference/9.jpg"), Map.entry("wave","/reference/9.jpg"),
                Map.entry("rose","/reference/9.jpg"), Map.entry("gourd","/reference/9.jpg"),
                Map.entry("horse","/reference/10.jpg"), Map.entry("earrings","/reference/10.jpg"),
                Map.entry("purple-horse","/reference/10.jpg"), Map.entry("small-earrings","/reference/10.jpg"),
                Map.entry("lotus","/reference/1.jpg"), Map.entry("pendant","/reference/1.jpg"),
                Map.entry("bamboo","/reference/1.jpg"), Map.entry("beads","/reference/1.jpg"),
                Map.entry("wedding","/reference/1.jpg"), Map.entry("charm","/reference/3.jpg"));
            if (!url.equals(allowed.get(crop))) bad("请上传 JPEG / PNG，或保留现有示例图片");
        }
    }
    public List<GoldPrice> prices() {
        return db.query("SELECT * FROM gold_prices ORDER BY material", (r,i) -> new GoldPrice(r.getString("material"),
                r.getBigDecimal("price"), r.getString("source"), r.getTimestamp("updated_at").toInstant().toString()));
    }
    @Transactional public void price(String material, GoldInput input) {
        if (db.update("UPDATE gold_prices SET price=?,source=?,updated_at=CURRENT_TIMESTAMP WHERE material=?", input.price(),input.source(),material) == 0)
            bad("材质不存在");
        audit("金价维护", material + " / " + input.price() + " 元每克");
    }
    public StoreInput store() {
        return db.queryForObject("SELECT * FROM store_settings WHERE id=1", (r,i) -> new StoreInput(r.getString("name"),r.getString("tagline"),r.getString("phone"),r.getString("wechat"),r.getString("notice")));
    }
    @Transactional public void store(StoreInput s) {
        db.update("UPDATE store_settings SET name=?,tagline=?,phone=?,wechat=?,notice=? WHERE id=1",s.name(),s.tagline(),s.phone(),s.wechat(),s.notice());
        audit("店铺设置", "更新店铺公开信息");
    }
    private record PricePatch(String sku, BigDecimal price, int stock) {}
    @Transactional public int importPrices(String text) {
        // 先完整校验，再在一个事务中写入；任意一行失败，全部回滚。
        List<PricePatch> changes = new ArrayList<>(); Set<String> seen = new HashSet<>();
        try (var parser = CSVParser.parse(text.replaceFirst("^\\uFEFF", ""), CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).setTrim(true).get())) {
            if (!parser.getHeaderNames().equals(List.of("sku","price","stock"))) bad("CSV 表头必须是 sku,price,stock");
            for (CSVRecord row : parser) {
                if (changes.size() >= 1000) bad("单次最多导入 1000 行");
                if (!row.isConsistent()) bad("第 " + (row.getRecordNumber()+1) + " 行列数错误");
                String sku=row.get("sku"); BigDecimal price=new BigDecimal(row.get("price")); int stock=Integer.parseInt(row.get("stock"));
                if (!seen.add(sku)) bad("重复款号："+sku);
                if (price.signum()<=0 || price.scale()>2 || price.compareTo(new BigDecimal("999999999.99"))>0 || stock<0 || stock>999999) bad("价格或库存超出范围："+sku);
                if (db.queryForObject("SELECT COUNT(*) FROM products WHERE sku=?", Integer.class, sku)==0) bad("不存在的款号："+sku);
                changes.add(new PricePatch(sku,price,stock));
            }
        } catch (ResponseStatusException e) { throw e; }
        catch (Exception e) { bad("CSV 解析失败，请使用 UTF-8 编码，并填写合法价格和整数库存"); }
        if (changes.isEmpty()) bad("CSV 没有数据行");
        changes.sort(Comparator.comparing(PricePatch::sku));
        for (var p:changes) db.update("UPDATE products SET price=?,stock=?,updated_at=CURRENT_TIMESTAMP WHERE sku=?",p.price,p.stock,p.sku);
        audit("批量导入", "更新 " + changes.size() + " 件商品的价格和库存");
        return changes.size();
    }
    public Map<String,Object> dashboard() {
        return Map.of("products", db.queryForObject("SELECT COUNT(*) FROM products",Integer.class),
                "activeProducts", db.queryForObject("SELECT COUNT(*) FROM products WHERE active=TRUE",Integer.class),
                "orders", db.queryForObject("SELECT COUNT(*) FROM shop_orders",Integer.class),
                "pendingOrders", db.queryForObject("SELECT COUNT(*) FROM shop_orders WHERE status='PENDING'",Integer.class),
                "lowStock",db.queryForObject("SELECT COUNT(*) FROM products WHERE active=TRUE AND stock<5",Integer.class),
                "database","UP","serverTime",java.time.Instant.now().toString(),
                "audit",db.query("SELECT * FROM audit_log ORDER BY id DESC LIMIT 30",(r,i)->Map.of("id",r.getLong("id"),"action",r.getString("action"),"detail",r.getString("detail"),"createdAt",r.getTimestamp("created_at").toInstant().toString())));
    }
    void audit(String action,String detail) { db.update("INSERT INTO audit_log(action,detail) VALUES(?,?)",action,detail); }
    static void bad(String message) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
}
