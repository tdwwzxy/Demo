/** 第 4 站：浏览器 HTTP 客户端，职责可类比 Java 中的 API Client。 */
// import type 只导入类型，编译后会被擦除；../ 表示当前目录的上一级。
import type { ApiResponse } from '../domain/user'

// 和 Java 泛型一样，T 不是网络数据的运行时校验器。
// 先将 JSON 视为 unknown，再交给调用者提供的解析器校验。
export async function request<T>(
  // async 函数返回 Promise，可类比 CompletableFuture<T>，但不是创建一条 Java 线程。
  path: string,
  // 函数类型：(参数名: 参数类型) => 返回类型。parse 是调用者传入的解析回调。
  parse: (data: unknown) => T,
  // RequestInit 是 DOM 库提供的 fetch 配置类型；= {} 是省略参数时的默认值。
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  // import.meta.env 由 Vite 提供；|| 在左边为假值时使用默认值。
  // replace(/\/$/, '') 去掉结尾的斜杠，避免拼接时出现 //。
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
  // fetch 是浏览器原生 API；await 暂停当前 async 函数的后续执行，不阻塞 UI 线程。
  const response = await fetch(`${base}${path}`, {
    // ... 对象展开：浅拷贝 options 的属性；后写的同名属性会覆盖前面的。
    ...options,
    // ?? 只在 null / undefined 时取右边，比 || 更精确；10_000 中的下划线只为易读。
    // 若调用者传入 signal，由调用者负责取消 / 超时；否则默认 10 秒超时。
    signal: options.signal ?? AbortSignal.timeout(10_000),
    // 此处按普通对象形式合并请求头；若日后要支持 Headers 实例，改用 new Headers(...)。
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  // fetch 遇到 HTTP 4xx / 5xx 通常仍成功返回 Response，因此需要显式判断 ok（2xx）。
  if (!response.ok) throw new Error(`HTTP ${response.status}：请求失败，请检查后端接口和开发代理。`)
  // response.json() 也是异步操作。声明 unknown，强制下面验证响应的结构。
  const payload: unknown = await response.json()
  // 'data' in payload 检查属性存在，并帮助 TS 缩小对象类型；不等于检查 data 的内容。
  if (typeof payload !== 'object' || payload === null || !('data' in payload)) {
    throw new Error('接口应返回 { data, message } 结构。')
  }
  return {
    // parse 负责具体 T 的运行时校验；比如 parseUsers 检查数组内每个 User。
    data: parse(payload.data),
    // 条件 ? 成立结果 : 否则结果，是三元表达式，Java 中也有相同语法。
    message: 'message' in payload && typeof payload.message === 'string' ? payload.message : 'ok',
  }
}
