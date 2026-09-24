# 从 Java 视角读懂这个 React 项目

## 先跑通一条数据链

从首页“加入购物车”开始，依次阅读 `App.tsx` 的 `add`、`Cart.submit`、`api.ts` 的 `api`、Java `ApiController.create`、`OrderService.create`。

```text
点击按钮 → onClick → setCart → React 重新渲染 → localStorage 保存
填写收货信息 → onSubmit → fetch POST /api/orders
    → Spring Security 校验 CSRF → Controller 校验 DTO
    → Service 事务锁定商品 → 按数据库价格计算 → 扣库存 → 保存订单
    → JSON 响应 → 跳到“我的订单”
```

前端计算的金额是预览，真正成交的订单金额由 Java `BigDecimal` 计算。订单保存单价快照，以后商家调价不会改写已提交的订单。

## TypeScript / React 与 Java 的对应关系

| 前端写法 | Java 开发者可以怎样理解 |
| --- | --- |
| `type Product = { ... }` | DTO 的编译期结构约定，但不会生成运行时校验器 |
| `const` / `let` | 引用不可重新赋值 / 变量可重新赋值；`const` 对象的字段仍可变 |
| `Product[]` | 接近 `List<Product>` 的用途 |
| `number` | JS 数值类型，不等于 Java `BigDecimal`，不要用它决定服务端金额 |
| `boolean \| null` | 联合类型：例如登录状态可为“已登录 / 未登录 / 还没查完” |
| `Promise<T>` | 异步结果；类似 `CompletableFuture<T>`，但浏览器主要使用事件循环 |
| `async` / `await` | 用顺序语法等待 Promise；不会把浏览器主线程阻塞在网络 I/O 上 |
| `interface CartProps` | 组件的输入参数契约，类似方法参数 DTO |
| `function ProductCard(...)` | 函数组件：输入 props，返回一段界面描述 |
| `<ProductCard product={p} />` | JSX 的组件调用，花括号里写 JavaScript 表达式 |
| `map` / `filter` / `reduce` | 接近 Stream 的映射 / 过滤 / 汇总，但返回 JS 数组或值 |

## Hooks：状态不是普通局部变量

```tsx
const [cart, setCart] = useState<CartLine[]>(readCart)
```

`useState` 返回“当前值”和“更新函数”，数组解构把它们分别命名。`CartLine[]` 是泛型参数；传入 `readCart` 函数可在初始化时读取浏览器存储。组件重新渲染时，React 会保留状态；普通局部变量则重新求值。

```tsx
setCart(current => [...current, { productId: product.id, quantity: 1 }])
```

箭头函数 `current => ...` 接收最新状态；`...current` 展开旧数组内容，创建一个新数组。不要对 React 状态直接 `push` 然后期待页面更新。对象更新同理：`{ ...old, price: 100 }` 复制字段，再覆盖 `price`。

`useEffect` 用来与 React 外部系统同步：保存 localStorage、监听路由变化、读取网络接口。返回的函数用于清理监听器或计时器。`[]` 表示没有响应式依赖；`[route.pathname]` 表示路径变化后再次执行。开发模式 `StrictMode` 会额外运行检查，因此 effect 要能正确清理。

## 表单与事件

```tsx
<input value={form.name} onChange={e => update('name', e.target.value)} />
```

这是受控输入框：显示内容来自状态，用户输入触发 `onChange`，状态更新后再渲染。`ProductEditor` 的 `update<K extends keyof ProductInput>` 让字段名与字段值类型对应，避免把布尔值传给价格字段。

```tsx
async function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  // await 请求完成后再更新页面；失败走 catch。
}
```

`preventDefault` 阻止浏览器默认的整页表单提交；`currentTarget` 是绑定事件的 form。`FormData.get` 返回值可能是字符串、文件或 null，因此需要按使用场景处理类型。文件上传用 `FormData` 传给 `fetch`，不能手动拼 multipart boundary。

## JSX 常见语法

- `className` 是 HTML `class` 的 JSX 写法。
- `{condition && <Tag />}` 根据条件显示内容。
- `{loading ? <Loading /> : <List />}` 对应条件表达式，渲染不同分支。
- `{products.map(p => <ProductCard key={p.id} product={p} />)}` 渲染列表。`key` 要稳定，使用数据库 ID。
- `?.` 是可选链，避免在 null / undefined 上读属性；`??` 只在 null / undefined 时取默认值。
- `import type` 仅引入类型，构建后不保留运行时导入。
- `void refresh()` 表示主动不使用 Promise 返回值；异步异常仍需 `.catch` 或函数内部处理。

## 推荐阅读顺序

1. `types.ts`：先看前后端的数据形状。
2. `api.ts`：网络请求、JSON、泛型、CSRF 和错误处理。
3. `components.tsx`：无复杂业务的图片、商品卡片、弹窗与 props。
4. `App.tsx`：状态、搜索、购物车、访客下单与订单列表。
5. `Admin.tsx`：认证状态、受控表单、文件上传与后台操作。
6. `OrderService.java`：事务、行锁、状态机与订单金额快照。
7. `ShoppingIntegrationTest.java` 与 `e2e.mjs`：用测试理解实际业务边界。

页面使用 hash 路由，例如 `#/cart`。`#` 后面的地址由前端解析，不会作为服务器路径发送，所以直接刷新后台、商品详情也能打开。这是为学习和单 JAR 部署选择的轻量实现，项目变大后可替换为 React Router。
