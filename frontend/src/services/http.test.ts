/** HTTP 测试使用 fetch 替身，不需要真正启动后端，也不会向外部网站发送请求。 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { request } from './http'
import { parseUsers } from '../domain/user'

// 等价于测试后的资源清理：将被替换的全局 fetch 恢复原状。
afterEach(() => vi.unstubAllGlobals())
describe('HTTP 客户端', () => {
  it('解析成功响应并传递请求参数', async () => {
    // vi.fn() 创建能记录调用的模拟函数；mockResolvedValue 让它返回成功的 Promise。
    // Response 是 Fetch API 的响应对象，现代 Node 也提供；这里用它模拟服务器结果。
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: [], message: 'ok' })))
    // 被测 request 调用 fetch 时实际调用此替身，可类比 Mockito 的依赖替换。
    vi.stubGlobal('fetch', fetchMock)
    expect(await request('/users', parseUsers)).toEqual({ data: [], message: 'ok' })
    // calls 是每次调用的参数列表：第一个 [0] 取首次调用，?.[0] 安全读取它的第一个参数。
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/users')
  })
  it('对非 2xx 状态提供可操作的错误信息', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })))
    await expect(request('/users', parseUsers)).rejects.toThrow('HTTP 500')
  })
  it('拒绝错误的包装结构和伪装成成功的无效数据', async () => {
    // mockResolvedValueOnce 按调用顺序提供不同响应，分别测试两种坏数据。
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('{"users":[]}'))
        .mockResolvedValueOnce(new Response('{"data":[{"id":"wrong"}]}')),
    )
    await expect(request('/users', parseUsers)).rejects.toThrow('接口应返回')
    await expect(request('/users', parseUsers)).rejects.toThrow('用户数据格式')
  })
  it('网络异常不会被包装成成功', async () => {
    // HTTP 500 是成功拿到响应但状态有误；网络失败是 fetch 的 Promise 直接拒绝，两者不同。
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(request('/users', parseUsers)).rejects.toThrow('Failed to fetch')
  })
})
