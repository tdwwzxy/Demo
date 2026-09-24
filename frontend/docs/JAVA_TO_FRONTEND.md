# Java 开发者的前端概念地图

| Java 经验            | 前端对应概念        | 重要区别                                               |
| -------------------- | ------------------- | ------------------------------------------------------ |
| DTO / record         | interface / type    | TS 类型在编译后被擦除；接口 JSON 需要运行时校验        |
| enum                 | 字符串联合类型      | `'ADMIN' \| 'VIEWER'` 直接约束字面量，不必生成枚举对象 |
| 泛型类 Result<T>     | ApiResponse<T>      | 可以使用泛型；不能靠泛型验证网络返回值                 |
| 方法参数             | Props               | 父组件向子组件传数据，子组件视为只读                   |
| 对象字段             | useState            | 状态属于组件实例；普通局部变量变化不会自动更新 UI      |
| Stream.filter/map    | Array.filter/map    | 本项目用它们产生新数组，更新 React 状态                |
| CompletableFuture    | Promise             | 类似异步结果容器，浏览器 await 不阻塞线程              |
| Controller / Service | 页面组件 / services | 只是职责分离的类比，浏览器端不是可信后端               |
| pom.xml              | package.json        | 管理依赖与 scripts，配合 pnpm-lock.yaml 固定版本       |
| JUnit                | Vitest              | 用 describe/it/expect 描述行为，测试可 mock fetch      |
| application.yml      | .env.local          | VITE_ 变量会进入客户端，可被用户查看                   |

## 四个最值得先纠正的习惯

### 1. 类型通过不等于接口数据正确

```ts
const payload: unknown = await response.json()
// parseUsers 会检查 id、name、email、role、enabled。
const users = parseUsers(payload)
```

`payload as User[]` 只是告诉编译器「相信我」，不是 JSON 反序列化校验器。Java 后端也要对外部输入做校验。

### 2. 以不可变方式更新状态

```ts
// 不要只修改 user.enabled 或原数组后期待界面同步。
setUsers((previous) =>
  previous.map((user) => (user.id === id ? { ...user, enabled: false } : user)),
)
```

React 根据状态和 Props 计算 UI。对象展开 `{ ...user }` 是浅拷贝，嵌套对象仍需逐层处理。

### 3. Effect 不等于「所有业务代码的入口」

事件触发的新增、删除放到事件处理函数中；能从现有状态计算出来的筛选结果直接计算，不另存一份状态。本项目只在 Effect 中处理加载与存储同步。

### 4. 浏览器和服务器的信任边界不同

前端隐藏按钮不是权限控制；表单 required 也不能代替 Jakarta Validation。不要在 VITE_ 环境变量里放密钥。真实登录、权限、持久化仍由后端负责。

## 读懂一条数据流

用户输入 → onChange → setForm → React 重新渲染 → 点击提交 → usersApi.create → mock/HTTP → 更新 users → 列表重新渲染。

从用户动作出发单步理解，比一次记住全部 API 更有效。
