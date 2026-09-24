/**
 * 本文件是页面内容配置，不是 React 组件。
 * interface 约束每个章节的字段；const 数组保存实际内容。新加章节时照此结构写一个对象即可。
 * 大段 code 是展示用字符串，其中的 \n 是换行转义，不会被当成 TypeScript 执行。
 */
export interface Lesson {
  // 稳定标识，同时被 React key 和学习进度存储引用，避免随意更名。
  id: string
  // 标题 / 副标题 / 阅读耗时 / 分类标签都是展示文本，不参与时间计算。
  title: string
  subtitle: string
  time: string
  tag: string
  java: string // 面向 Java 开发者的概念对照。
  concept: string
  code: string // 作为纯文本放进 <pre><code>，不是 innerHTML。
  exercise: string
  file: string // 推荐阅读的源码路径，仅供显示，不会自动读取文件。
}

// Lesson[] 是类型注解，保证数组中每个对象都有需要的字段。
// 对象之间的逗号分隔元素；尾随逗号是合法 TS / JS 语法，便于增删行。
export const lessons: Lesson[] = [
  {
    id: 'typescript',
    title: '从 DTO 到 TypeScript',
    subtitle: '类型、接口、联合类型与泛型',
    time: '30 分钟',
    tag: 'TypeScript',
    java: '把 interface User 想成 DTO 的形状约定；Role 的联合类型类似枚举。区别是 TS 类型在运行时不存在。',
    concept: '使用 unknown 接收外部数据，用类型守卫检查它。不要用 any 或 as User 掩盖接口不匹配。',
    code: "type Role = 'ADMIN' | 'DEVELOPER' | 'VIEWER'\n\ninterface User {\n  id: number\n  name: string\n  role: Role\n}\n\ntype UserInput = Omit<User, 'id'>\ntype ApiResponse<T> = { data: T; message: string }",
    exercise: '为 User 增加可选字段 department?: string，并同步修改校验函数、表单和列表。',
    file: 'src/domain/user.ts',
  },
  {
    id: 'components',
    title: '用组件组织界面',
    subtitle: 'JSX、Props 与单向数据流',
    time: '25 分钟',
    tag: 'React',
    java: 'Props 类似方法参数，组件像一个返回 UI 的函数。但组件不属于 Controller，也不直接操作数据库。',
    concept:
      '父组件通过 Props 传入数据和回调。子组件调用回调通知变化；不要直接修改 Props。JSX 是语法扩展，不是 HTML 字符串。',
    code: "type BadgeProps = { enabled: boolean }\n\nfunction StatusBadge({ enabled }: BadgeProps) {\n  return (\n    <span>{enabled ? '已启用' : '已停用'}</span>\n  )\n}\n\n<StatusBadge enabled={true} />",
    exercise: '将用户表格里的角色标签提取成 RoleBadge 组件，给它声明 Props 类型。',
    file: 'src/components/StatusBadge.tsx',
  },
  {
    id: 'state',
    title: '让界面响应变化',
    subtitle: 'useState、事件与受控表单',
    time: '35 分钟',
    tag: 'Hooks',
    java: '组件状态不是 Spring 单例字段。每个组件实例独立持有状态，更新状态会触发新的渲染。',
    concept:
      '每次渲染拿到的是状态快照。依赖旧值时用函数式更新；用 map/filter 创建新数组，避免原地修改。',
    code: "const [count, setCount] = useState(0)\n\n// 连续执行时，每次拿到上一次的结果\nsetCount(previous => previous + 1)\n\nconst [name, setName] = useState('')\n<input\n  value={name}\n  onChange={event => setName(event.target.value)}\n/>",
    exercise: '进入「交互实验」，尝试 +1、连续 +3 和表单输入，再增加一个步长选择器。',
    file: 'src/pages/ReactLab.tsx',
  },
  {
    id: 'async',
    title: '从请求到界面状态',
    subtitle: 'Promise、async/await 与 Effect',
    time: '40 分钟',
    tag: 'API',
    java: 'Promise 可以类比 CompletableFuture，但浏览器 JavaScript 通常在事件循环中执行；await 不是阻塞当前线程。',
    concept:
      'Effect 用来与外部系统同步。请求要考虑加载、成功、失败以及组件卸载后的响应；开发模式 StrictMode 会额外检查 Effect 清理。',
    code: 'useEffect(() => {\n  let active = true\n  usersApi.list()\n    .then(data => { if (active) setUsers(data) })\n    .catch(error => { if (active) setError(error.message) })\n  return () => { active = false }\n}, [])',
    exercise:
      '在「接口调试」模拟错误，观察 loading / success / error；阅读 HTTP 封装中的状态码与响应结构校验。',
    file: 'src/services/http.ts',
  },
  {
    id: 'crud',
    title: '完成一个业务闭环',
    subtitle: '用户管理、筛选与本地持久化',
    time: '50 分钟',
    tag: '实战',
    java: '按 domain → services → components/pages 分层：数据契约、请求逻辑和界面职责分开。',
    concept:
      '组件持有表单和展示状态，service 处理数据访问。本地模拟模式使用 localStorage，刷新页面后仍保留数据。',
    code: 'const visibleUsers = filterUsers(users, keyword, role)\n\nasync function createUser(input: UserInput) {\n  const created = await usersApi.create(input)\n  setUsers(previous => [...previous, created])\n}\n\n// 删除后的视图更新\nsetUsers(previous => previous.filter(user => user.id !== id))',
    exercise: '完成一次新增 → 编辑 → 搜索 → 删除，再增加「仅看已启用」筛选项。',
    file: 'src/pages/UsersPage.tsx',
  },
  {
    id: 'backend',
    title: '连接你的 Spring Boot',
    subtitle: '环境变量、Vite 代理与构建',
    time: '40 分钟',
    tag: '联调',
    java: 'package.json 可类比 pom.xml；pnpm 管依赖，Vite 管开发服务和构建。它们不是 Java Web 服务的替代品。',
    concept:
      '开发时浏览器请求 /api，由 Vite 转发到后端。生产构建只生成静态文件，部署时还需要服务器反向代理。',
    code: '# .env.local\nVITE_USE_MOCK=false\nVITE_API_BASE_URL=/api\nAPI_PROXY_TARGET=http://localhost:8080\n\n# 修改环境变量后重启开发服务\npnpm dev\n\n# 先类型检查，再生成 dist/\npnpm build',
    exercise:
      '按 docs/SPRING_BOOT.md 启动示例后端，切换真实接口模式，用浏览器 Network 面板观察请求。',
    file: 'vite.config.ts',
  },
]
