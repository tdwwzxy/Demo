export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

// 泛型 T 表示预期响应的 DTO；async 返回 Promise，await 不阻塞页面渲染线程。
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const method = (options.method ?? 'GET').toUpperCase()
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    // 每次写操作取当前 token，登录/退出导致会话变更后也不会复用旧 token。
    const csrf = await fetch('/api/csrf', { credentials: 'same-origin' })
    if (!csrf.ok) throw new ApiError('无法取得会话，请刷新页面重试', csrf.status)
    const token: { token: string; headerName: string } = await csrf.json()
    headers.set(token.headerName, token.token)
  }
  if (typeof options.body === 'string' && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json')
  // FormData 上传不能手动设置 Content-Type，浏览器需要自动补充 multipart boundary。
  const response = await fetch(`/api${path}`, { ...options, headers, credentials: 'same-origin' })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: `请求失败（${response.status}）` }))
    throw new ApiError(error.message || '请求失败', response.status)
  }
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : (undefined as T)
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '操作失败，请稍后重试'
