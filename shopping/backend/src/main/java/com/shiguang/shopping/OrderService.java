package com.shiguang.shopping;

import static com.shiguang.shopping.Models.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrderService {
    private final JdbcTemplate db;
    private final CatalogService catalog;
    OrderService(JdbcTemplate db, CatalogService catalog) { this.db=db; this.catalog=catalog; }
    public List<ShopOrder> orders(String owner, boolean admin) {
        return db.query("SELECT * FROM shop_orders " + (admin ? "" : "WHERE guest_hash=? ") + "ORDER BY created_at DESC LIMIT 200",
                (r,i) -> new ShopOrder(r.getString("id"),r.getString("customer_name"),r.getString("phone"),r.getString("address"),r.getString("note"),r.getString("status"),r.getBigDecimal("total"),r.getTimestamp("created_at").toInstant().toString(),r.getTimestamp("updated_at").toInstant().toString(),items(r.getString("id"))),
                admin ? new Object[]{} : new Object[]{owner});
    }
    private List<OrderItem> items(String id) {
        return db.query("SELECT * FROM order_items WHERE order_id=? ORDER BY id",(r,i)->new OrderItem(r.getLong("product_id"),r.getString("name"),r.getString("sku"),r.getBigDecimal("price"),r.getInt("quantity"),r.getString("image_url"),r.getString("image_crop")),id);
    }
    @Transactional public ShopOrder create(String owner, OrderInput input) {
        if (owner == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"访客会话不存在，请刷新页面");
        // 有序加锁可减少并发下单的死锁风险；不接受前端传来的单价、总价或库存。
        TreeMap<Long,Integer> quantities=new TreeMap<>();
        for (var item: input.items()) quantities.merge(item.productId(),item.quantity(),Integer::sum);
        if (quantities.values().stream().anyMatch(q->q>99)) CatalogService.bad("同一商品最多购买 99 件");
        List<OrderItem> lines=new ArrayList<>(); BigDecimal total=BigDecimal.ZERO;
        for (var entry:quantities.entrySet()) {
            Product p=db.query("SELECT * FROM products WHERE id=? FOR UPDATE",CatalogService.PRODUCT,entry.getKey()).stream().findFirst()
                    .orElseThrow(()->new ResponseStatusException(HttpStatus.CONFLICT,"商品已不存在，请刷新购物车"));
            if (!p.active() || p.stock()<entry.getValue()) throw new ResponseStatusException(HttpStatus.CONFLICT,p.name()+" 已下架或库存不足");
            total=total.add(p.price().multiply(BigDecimal.valueOf(entry.getValue())));
            lines.add(new OrderItem(p.id(),p.name(),p.sku(),p.price(),entry.getValue(),p.imageUrl(),p.imageCrop()));
            db.update("UPDATE products SET stock=stock-?,updated_at=CURRENT_TIMESTAMP WHERE id=?",entry.getValue(),p.id());
        }
        String id="SG"+UUID.randomUUID().toString().replace("-","").substring(0,20).toUpperCase(Locale.ROOT);
        db.update("INSERT INTO shop_orders(id,guest_hash,customer_name,phone,address,note,status,total) VALUES(?,?,?,?,?,?,'PENDING',?)",id,owner,input.customerName().trim(),input.phone().trim(),input.address().trim(),input.note(),total);
        for (var line:lines) db.update("INSERT INTO order_items(order_id,product_id,name,sku,price,quantity,image_url,image_crop) VALUES(?,?,?,?,?,?,?,?)",id,line.productId(),line.name(),line.sku(),line.price(),line.quantity(),line.imageUrl(),line.imageCrop());
        return orders(owner,false).stream().filter(order->order.id().equals(id)).findFirst().orElseThrow();
    }
    @Transactional public void status(String id,String next) {
        var rows=db.queryForList("SELECT status FROM shop_orders WHERE id=? FOR UPDATE",String.class,id);
        if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"订单不存在");
        String current=rows.getFirst();
        boolean allowed=(current.equals("PENDING") && Set.of("CONFIRMED","CANCELLED").contains(next))
                || (current.equals("CONFIRMED") && Set.of("COMPLETED","CANCELLED").contains(next));
        if(!allowed) throw new ResponseStatusException(HttpStatus.CONFLICT,"订单状态已变化或不允许此操作，请刷新");
        if(next.equals("CANCELLED")) for(var line:items(id).stream().sorted(Comparator.comparingLong(OrderItem::productId)).toList())
            db.update("UPDATE products SET stock=stock+?,updated_at=CURRENT_TIMESTAMP WHERE id=?",line.quantity(),line.productId());
        db.update("UPDATE shop_orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",next,id);
        catalog.audit("订单状态",id+" / "+current+" → "+next);
    }
}
