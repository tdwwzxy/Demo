# Frontend Lab：Java 开发者的前端学习项目

这是一个可直接运行的学习工程，使用 **TypeScript + React + Vite + pnpm**。通过「用户管理」串起类型、组件、表单、异步请求和 Spring Boot 联调。默认使用浏览器模拟数据，不需要先启动 Java 后端。

## 5 分钟开始

建议使用 Node.js 24 LTS。本项目生成时使用 Node 24.21.0、pnpm 11.19.0；实际依赖版本锁定在 `pnpm-lock.yaml`。

```powershell
cd C:\Users\Administrator\Documents\ChatGPT\Demo\frontend
pnpm install
pnpm dev
```

浏览器打开 http://127.0.0.1:5173 。修改 `src/` 下的代码并保存，观察页面热更新。

项目现已迁移到 [Demo 仓库的 frontend 子目录](https://github.com/tdwwzxy/Demo/tree/main/frontend)。其他电脑克隆 Demo 后，在仓库根目录执行 `cd frontend` 即可；上面的绝对路径仅对应当前电脑。本项目与 `shopping/frontend` 珠宝商城前端分别安装依赖、分别运行。

如果电脑还没有 pnpm，在已安装 Node.js 的终端执行：

```powershell
npm install -g pnpm@11.19.0
```

本机 Codex 自带 pnpm 命令；普通终端的 PATH 可能不同。不要混用 npm / yarn 安装项目依赖，不提交其他包管理器的锁文件。

## 你可以学到什么

| 页面     | 可以实际操作                              | 对应知识                                   |
| -------- | ----------------------------------------- | ------------------------------------------ |
| 学习路线 | 阅读 6 个章节、查看代码示例、记录完成状态 | TS 类型、Props、Hooks、异步、CRUD、联调    |
| 交互实验 | 计数、连续 +3、文本输入、条件显示         | 状态快照、函数式更新、受控表单、单向数据流 |
| 用户管理 | 新增、编辑、删除、搜索、角色筛选          | 表单校验、列表 key、派生状态、service 分层 |
| 接口调试 | 获取用户、模拟失败、查看 JSON 和耗时      | Promise、loading/error/success、运行时校验 |

模拟用户和学习进度存储在当前浏览器 localStorage，分别使用 `frontend-lab.users.v1`、`frontend-lab.progress.v1`。不同浏览器、协议、主机名或端口不共享这些数据；测试账户不代表真实账号。

## 推荐阅读顺序

**新增：[源码语法阅读索引](docs/SYNTAX_READING_GUIDE.md)**。源码已经加入面向 Java 开发者的中文教学注释，复杂语法按步骤展开解释；建议先从该索引的 1–4 步开始。

1. [学习路线与练习](docs/LEARNING_PATH.md)：先运行，每节完成一个小修改。
2. [Java → TypeScript / React 对照](docs/JAVA_TO_FRONTEND.md)：理解哪些经验可以迁移，哪些需要调整。
3. `src/domain/user.ts`：从熟悉的 DTO 开始。
4. `src/pages/ReactLab.tsx`：学习状态与事件。
5. `src/pages/UsersPage.tsx` → `src/services/users.ts` → `src/services/http.ts`：顺着一次请求读代码。
6. [Spring Boot 对接指南](docs/SPRING_BOOT.md)：准备好之后再切换真实接口。

## 项目结构

```text
frontend/
├─ src/
│  ├─ main.tsx                # React 应用入口，启用 StrictMode
│  ├─ App.tsx                 # 导航与页面组合，简单状态切页
│  ├─ components/            # 小型可复用 UI 组件
│  ├─ domain/user.ts         # DTO、联合类型、运行时校验、筛选纯函数
│  ├─ hooks/useProgress.ts   # 学习进度持久化
│  ├─ data/lessons.ts        # 章节内容和练习说明
│  ├─ pages/                 # 学习路线、交互实验、用户管理、接口调试
│  ├─ services/              # HTTP 封装和可切换的模拟服务
│  └─ **/*.test.ts           # 业务规则和接口异常测试
├─ docs/                     # 中文学习文档
├─ .env.example              # 环境变量示例
├─ vite.config.ts            # 开发服务器和 /api 代理
├─ tsconfig.app.json         # strict 模式与未使用变量检查
├─ package.json              # 依赖和命令
└─ pnpm-lock.yaml            # 可重复安装的依赖版本
```

刻意使用 React 自带 Hooks、原生 fetch 和 CSS，不预先引入 Redux、UI 组件库或 React Router。先掌握基础，再按练习添加它们。当前导航是组件状态切换，不是 URL 路由；刷新回到学习路线。

## 常用命令

| 命令              | 用途                   | Java 开发者可参考的含义        |
| ----------------- | ---------------------- | ------------------------------ |
| `pnpm install`    | 按依赖声明安装         | 类似下载 Maven 依赖            |
| `pnpm dev`        | 启动开发服务和 HMR     | 开发期间使用                   |
| `pnpm typecheck`  | 检查 TS 类型           | 类似编译期检查，不生成应用产物 |
| `pnpm lint`       | Oxlint 静态规则检查    | 类似 Checkstyle / 部分静态分析 |
| `pnpm test`       | 运行 Vitest 测试       | 类似 JUnit 测试                |
| `pnpm test:watch` | 修改测试后自动重跑     | 本地练习反馈循环               |
| `pnpm build`      | 类型检查 + 生产打包    | 生成 `dist/` 静态资源          |
| `pnpm preview`    | 本地预览生产构建       | 先运行 build；默认 4173 端口   |
| `pnpm check`      | 类型、规则、测试、构建 | 提交前的完整检查               |
| `pnpm format`     | 格式化代码与文档       | 统一可读性                     |

## 联调与部署边界

默认 `.env.local` 不存在时仍为模拟模式。复制 `.env.example` 为 `.env.local` 后可以切换模式；修改环境变量需要重启 Vite。

`VITE_` 前缀变量会进入浏览器产物，不能放密码或服务端密钥。开发代理仅作用于 `pnpm dev`，不会随构建产物部署；真实接口的 `pnpm preview` / 生产访问需要反向代理或独立配置允许跨域的 API 地址。详见联调文档。

## 遇到问题

- **5173 被占用**：本项目设置了 strictPort，会明确报错。停止占用者，或者 `pnpm dev --port 5174`；不同端口的本地练习数据独立。
- **类型错误但页面能显示**：开发热更新不等于类型检查，运行 `pnpm typecheck`。
- **开发时初始化请求执行两次**：StrictMode 会检查 Effect 清理；本例使用 active 标志防止过期响应写回，并不因此关闭 StrictMode。
- **真实接口失败**：检查 Spring Boot 是否启动、代理地址、HTTP 状态和 JSON 是否使用 `{ data, message }`。
- **本地数据损坏**：DevTools → Application → Local Storage，只删除 `frontend-lab.users.v1` 这一练习键，再刷新。不要清空其他站点数据。

## 官方学习资料

- [React 的 TypeScript 指南](https://react.dev/learn/typescript)
- [React 状态快照](https://react.dev/learn/state-as-a-snapshot)
- [Vite 入门](https://vite.dev/guide/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [pnpm 文档](https://pnpm.io/)
