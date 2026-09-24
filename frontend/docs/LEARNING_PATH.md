# 学习路线：先动手，再扩展

建议分 6 次练习，每次 25–50 分钟。完成不是「读完」，而是能修改代码、解释运行结果。

## 1. TypeScript：用 DTO 建立第一层联系

阅读 `src/domain/user.ts`，识别 `User`、`UserInput`、`Role`、`ApiResponse<T>`。

练习：增加 `department?: string`，让新字段在表单和列表可见。先写类型，再改输入和显示，再补齐运行时解析。

验收：旧数据没有 department 仍能显示；新增用户可保存部门；`pnpm typecheck` 通过。

## 2. 组件：像拆函数一样拆界面

阅读 `src/components/StatusBadge.tsx` 和 `src/pages/UsersPage.tsx`。

练习：把角色标签拆成 `RoleBadge`，Props 使用 `Role`，不使用任意 string。

验收：三种角色都能显示；写入不存在的角色会被 TS 拒绝；不要把数据获取塞到标签组件里。

## 3. 状态与事件：摆脱直接改 DOM

打开交互实验，分别点击 +1、连续 +3，输入称呼，切换欢迎卡片。

练习：增加步长 `step`，允许选择 1、5、10；增加最大值 100，并在达到上限时禁用增加按钮。

验收：快速点击也不丢失更新；重置后归零；无法超过上限。

思考：`setCount(count + 1)` 捕获的是本次渲染的 count；依赖旧状态时，`setCount(previous => previous + 1)` 可以按更新队列累加。

## 4. 异步：把失败也当成一种状态

阅读 `src/pages/ApiLab.tsx` 和 `src/services/http.ts`。

练习：为接口调试台增加「重新请求」按钮，错误时可重试；进一步尝试给 fetch 传 AbortController.signal，并在清理函数中取消。

验收：请求中禁用重复提交；失败后有明确反馈；成功之后错误信息不残留。

注意：`active=false` 能忽略旧响应，但不会真的取消网络请求。取消请求是进阶练习。

## 5. CRUD：完成端到端业务

在用户管理页面创建用户、修改角色、搜索邮箱、删除用户。

练习：增加「仅显示已启用」复选框，把筛选条件组合到 `filterUsers` 中，并增加单元测试。

验收：关键字 + 角色 + 启用状态能组合筛选；清除筛选恢复列表；刷新后数据仍在。

进一步练习：前端分页，每页 5 条。删除最后一页的最后一条数据后，页码仍合法。

## 6. Spring Boot：把模拟接口换成真实接口

按 `SPRING_BOOT.md` 建立接口，先用 curl / IDE HTTP Client 验证，再修改 `.env.local`。

验收：Network 面板里能看到真实 GET/POST/PUT/DELETE；后端返回 500 时有错误提示；构建后的代理区别解释得清楚。

## 接下来可以做

1. 加入 React Router，实现 `/users` 地址和浏览器前进/后退。
2. 用服务端分页替换前端筛选；把分页参数映射到 Java PageRequest。
3. 集成成熟表单库与 schema 校验；比较学习成本与收益。
4. 用 TanStack Query 管理请求缓存、失效与重试，理解它解决的问题。
5. 用 Playwright 为新增 → 编辑 → 删除建立浏览器测试。

先完成基础六步，再引入库。每次增加一个概念，保留可以工作的版本。
