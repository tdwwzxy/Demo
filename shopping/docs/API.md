# 接口与业务边界

同源 `/api` 接口返回 JSON。公开读取无需登录；所有写请求（包括登录、退出、访客下单）需要 CSRF token。

先 GET `/api/csrf`，从响应读取 `headerName` 与 `token`，后续写请求带上对应请求头并保留会话 Cookie。登录和退出会变更会话，因此前端每次写操作重新获取 token。

## 访客接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/products` | 所有已上架商品 |
| GET | `/products/{id}` | 上架商品详情；下架后返回 404 |
| GET | `/store` | 店铺名称、标语、电话、微信、公告 |
| GET | `/prices` | 人工维护的参考金价和来源 |
| GET | `/orders` | 仅当前 `SHOP_GUEST` Cookie 对应的订单，最多最近 200 条 |
| POST | `/orders` | 提交预订，成功为 201 |
| GET | `/csrf` | 当前会话的 CSRF token |

订单请求例子：

```json
{
  "customerName": "测试访客",
  "phone": "13800000000",
  "address": "测试市测试区测试街道 1 号",
  "note": "请联系确认尺寸",
  "items": [{ "productId": 1, "quantity": 1 }]
}
```

价格、库存、总额不能由客户端决定。相同商品合并数量，单商品最多 99 件、请求最多 50 行；商品不存在、下架或库存不足返回 409。所有商品按 ID 排序加行锁，然后在一个事务中校验、扣库存和创建订单，任一步失败全部回滚。

`SHOP_GUEST` 为随机高熵匿名 Cookie，HttpOnly、SameSite=Lax，数据库仅保存其哈希。无需注册，但必须保留浏览器 Cookie。接口不会按任意访客传入的手机号或订单号直接返回别人的订单。

## 登录与管理员接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/auth/login` | URL 编码表单 `username`、`password`，成功创建会话 |
| GET | `/auth/me` | 当前管理员；未登录 401 |
| POST | `/auth/logout` | 销毁会话，成功 204 |
| GET | `/admin/dashboard` | 商品、订单、低库存、数据库状态和最近 30 条审计 |
| GET | `/admin/products` | 所有商品（含下架） |
| POST | `/admin/products` | 新建商品，成功 201 |
| PUT | `/admin/products/{id}` | 完整更新商品 DTO；`active` 控制上下架 |
| POST | `/admin/uploads` | multipart 字段 `file`，返回 `imageUrl` |
| GET | `/admin/orders` | 最近 200 条全店订单 |
| PUT | `/admin/orders/{id}/status` | `{"status":"CONFIRMED"}` 等状态变更 |
| GET | `/admin/prices/template` | 下载 UTF-8 CSV 模板 |
| POST | `/admin/prices/import` | multipart 字段 `file`，原子批量更新商品价和库存 |
| PUT | `/admin/prices/{material}` | `{"price":998.8,"source":"商家报价"}` |
| PUT | `/admin/store` | 更新完整店铺设置 DTO |

完整字段及限制以 `Models.java` 为准。所有 `/admin/**` 都在 Spring Security 校验 ADMIN 权限；未认证 401、权限不足或 CSRF 不合法 403。密码 BCrypt 编码，单来源 IP 15 分钟内连续失败 10 次后限流，下一次返回 429。限流存储在内存中，多实例部署需换成共享存储。

订单状态流转：

```text
PENDING   → CONFIRMED / CANCELLED
CONFIRMED → COMPLETED / CANCELLED
COMPLETED、CANCELLED 为终态
```

允许取消的前置状态只有 PENDING 和 CONFIRMED。已完成或已取消不能再次取消。取消事务锁定订单、恢复库存、更新状态，防止重复恢复库存。后台“已完成”是人工履约状态，不代表支付网关已扣款。

## 当前范围

- 本地单实例 H2，管理员为一个账号；没有多租户、员工角色、商品删除、发货物流或支付退款。
- 订单和运营日志采用固定最近条数，适合演示；大量商品/订单时应增加分页与索引设计。
- 库存是可售库存：下单预占，取消释放。后台填写库存或 CSV 导入会覆盖该商品当前可售数量，操作前应确认盘点结果。
- 图片 URL 只允许真实上传文件或预置参考图片，不抓取远程任意链接。
- 商品保存和后台写操作有审计；审计未记录收货地址或登录密码。
- 当前未实现匿名订单的验证码、幂等提交键或自动超时释放，商家通过取消预订释放库存。真实开放售卖前需结合流量和业务补充这些机制。
