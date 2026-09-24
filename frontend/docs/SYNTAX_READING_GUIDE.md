# 源码语法阅读索引（面向 Java 开发者）

现在源码中已直接加入中文语法注释。这份索引用来定位「在哪里读」，不需要先把所有概念背完。

## 推荐顺序

| 顺序 | 文件                                                                      | 重点观察                                              |
| ---- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1    | [index.html](../index.html) → [main.tsx](../src/main.tsx)                 | 浏览器入口、ES 模块、React 挂载、非空断言、StrictMode |
| 2    | [user.ts](../src/domain/user.ts)                                          | DTO、联合类型、泛型、unknown、类型守卫、数组方法      |
| 3    | [StatusBadge.tsx](../src/components/StatusBadge.tsx)                      | 最小组件、Props 参数解构、JSX 插值                    |
| 4    | [ReactLab.tsx](../src/pages/ReactLab.tsx)                                 | useState、状态快照、箭头函数、受控输入、条件渲染      |
| 5    | [App.tsx](../src/App.tsx) → [Roadmap.tsx](../src/pages/Roadmap.tsx)       | 父子组件、回调、列表 key、类型推导与索引访问          |
| 6    | [useProgress.ts](../src/hooks/useProgress.ts)                             | 自定义 Hook、惰性初始化、Set 去重、Effect 依赖        |
| 7    | [UsersPage.tsx](../src/pages/UsersPage.tsx)                               | 表单完整流程、异步状态、Effect 清理、useRef           |
| 8    | [users.ts](../src/services/users.ts) → [http.ts](../src/services/http.ts) | 服务分层、对象展开、Promise、fetch、JSON 校验         |
| 9    | [ApiLab.tsx](../src/pages/ApiLab.tsx)                                     | 可辨识联合类型、类型收窄、错误展示                    |
| 10   | [index.css](../src/index.css) → [App.css](../src/App.css)                 | 选择器、盒模型、Flex、Grid、响应式布局                |
| 11   | [vite.config.ts](../vite.config.ts)、tsconfig 系列                        | 工具运行环境、代理、类型检查和打包职责                |
| 12   | [user.test.ts](../src/domain/user.test.ts)、services 下的测试             | Vitest 与 JUnit / Mockito 的概念联系                  |

第一遍可以先读 1–4，改计数器和欢迎卡片；第二遍顺着一次「新增用户」读 7–8。

## 最常见的符号，怎么读

| 写法                                    | 读法 / 作用                   | 注意点                                           |
| --------------------------------------- | ----------------------------- | ------------------------------------------------ |
| `name: string`                          | name 的类型是 string          | 类型注解编译后擦除                               |
| `{ name: '李明' }`                      | 创建对象，name 属性值是字符串 | 同样的冒号，这里是运行时赋值                     |
| `const { name } = user`                 | 从对象取出 name               | 对象解构，不是创建同名 DTO                       |
| `const [value, setValue] = useState(0)` | 从二元数组取出状态和 setter   | 数组解构，名字可由你决定                         |
| `(x) => x + 1`                          | 接收 x，返回 x+1              | 箭头函数；没有花括号时隐式返回                   |
| `(x) => { return x + 1 }`               | 多语句函数体                  | 加了花括号就要显式 return 返回值                 |
| `(x) => ({ id: x })`                    | 返回对象字面量                | 外面的圆括号避免把对象误读成函数体               |
| `<T>`                                   | 类型参数                      | 在函数 / 类型声明处是泛型，在 JSX 中还可能是标签 |
| `Role \| 'ALL'`                         | 允许其中任一类型的值          | 联合类型，不是位运算                             |
| `...object`                             | 对象属性展开                  | 浅拷贝；后面的同名字段覆盖前面的                 |
| `[...list, item]`                       | 创建新数组并追加 item         | 不原地修改原数组                                 |
| `value as User`                         | 告诉编译器把它视为 User       | 不检查数据，不等于安全反序列化                   |
| `value is User`                         | 类型守卫的返回类型声明        | 只有实现真的校验字段，才可靠                     |
| `value!`                                | 非空断言                      | 不产生运行时保护                                 |
| `!value`                                | 逻辑取反                      | 和后缀的非空断言完全不同                         |
| `user?.name`                            | 对象非空时才读 name           | 对象为空得到 undefined                           |
| `x ?? fallback`                         | 只在 null / undefined 时回退  | 保留 0、false、空字符串                          |
| `x \|\| fallback`                       | 在任何假值时回退              | 0、false、空字符串也触发回退                     |
| `condition ? a : b`                     | 条件选择表达式                | 类似 Java 的三元运算符                           |
| `condition && <Panel />`                | 条件成立才渲染组件            | 条件尽量用 boolean；数字 0 可能被显示出来        |
| `void asyncCall()`                      | 调用后丢弃返回值              | 不负责捕获 Promise 异常                          |

## 把最常见的表单语法拆开

这是项目中一行 `onChange` 的展开理解，不必把源码改成下面的冗长写法：

```tsx
// JSX 属性里的 {} 放的是一个 JS 表达式：这里是一整个函数。
onChange={(event) => {
  // input.value 始终是字符串；数字输入也需按业务需要显式转换。
  const newName = event.target.value

  // 浅拷贝当前 DTO，保留 email、role、enabled，覆盖 name。
  const nextForm = { ...form, name: newName }

  // 告诉 React 下次渲染使用新对象，而不是修改 DOM 或 form.name。
  setForm(nextForm)
}}
```

单次输入事件中使用当前表单快照即可；若更新跨异步等待或需要依赖队列中的最新状态，优先考虑 `setForm(previous => ({ ...previous, name: newName }))`。

## 几个 Java 经验不能直接套用的地方

1. **组件函数会重复执行**：不是构造器，也不是每个 HTTP 请求调用一次的 Controller。它根据当前 Props 和状态计算 UI。
2. **状态 setter 不会立刻改局部变量**：调用 setCount 后，本次处理函数中的 count 仍是原快照。
3. **对象更新不会自动合并**：useState 对象的 setter 接收的是新状态，要保留字段就展开旧对象。
4. **TypeScript 不替代运行时校验**：interface 和泛型擦除后，接口仍可能返回错误结构。
5. **await 不等于阻塞线程**：它把后续逻辑安排到异步结果完成后，浏览器仍可处理其他工作。
6. **Effect 清理不是析构器**：依赖变化时也会清理旧 Effect，不只在卸载组件时执行。

## 为什么没有给 package.json 的每一行写注释

`package.json` 是严格 JSON，不允许 `//` 或 `/* ... */`。乱加注释会导致 pnpm 读取失败。它的字段含义在这里解释：

| 字段               | 含义                                                      |
| ------------------ | --------------------------------------------------------- |
| `name` / `version` | 当前包名称、版本，不代表 React 或 Vite 版本               |
| `private: true`    | 防止误把这个学习项目当 npm 包发布                         |
| `type: "module"`   | Node 按 ES 模块规则解释此包中的 .js 文件                  |
| `packageManager`   | 项目约定的 pnpm 版本，配合支持此字段的工具使用            |
| `engines`          | 声明运行环境要求，不自动安装 Node                         |
| `scripts`          | `pnpm dev` / `pnpm test` 等快捷命令；不是 JavaScript 函数 |
| `dependencies`     | 应用运行依赖，如 React                                    |
| `devDependencies`  | 开发、构建、检查工具，如 TypeScript / Vite / Vitest       |

`tsconfig*.json` 使用支持注释的 JSONC，因此已在文件内解释关键字段。`pnpm-lock.yaml` 是 pnpm 生成的锁文件，不手工改写或添加逐行教学注释。`node_modules/` 和 `dist/` 也不作为学习注释的编辑对象。

## 看注释时的节奏

读一段 → 在页面上操作一次 → 修改一个值 → 运行 `pnpm typecheck`。做完一个小练习再运行 `pnpm check`。重复出现的普通标签和间距不逐行复述，遇到新语法、状态变化或数据边界时查看旁边的详细说明。
