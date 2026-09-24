/** 异步服务测试：类似 JUnit 的前置 / 后置初始化，加上模拟浏览器依赖。 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { USERS_KEY, usersApi } from './users'

describe('本地模拟用户服务', () => {
  // JS Map 与 Java Map 都保存键值对；此处明确 key 和 value 都是 string。
  let storage: Map<string, string>
  // 每个 it 执行前重建存储，测试之间不共享用户数据。
  beforeEach(() => {
    storage = new Map()
    // 单元测试运行在 Node，不依赖真实浏览器；替换全局 localStorage，类似注入测试替身。
    vi.stubGlobal('localStorage', {
      // Map.get 不存在时返回 undefined，而 localStorage.getItem 约定返回 null，故用 ?? 转换。
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    })
  })
  // 每个测试后恢复全局对象，防止这个 mock 污染其他测试。
  afterEach(() => vi.unstubAllGlobals())

  it('新增、编辑、重读、删除构成完整的数据闭环', async () => {
    // 回调标记为 async，测试框架会等待 Promise 完成；每个 await 表示依次等待服务结果。
    const before = await usersApi.list()
    const user = await usersApi.create({
      name: '测试用户',
      email: 'test@example.com',
      role: 'VIEWER',
      enabled: true,
    })
    expect(await usersApi.list()).toHaveLength(before.length + 1)
    await usersApi.update(user.id, { ...user, enabled: false })
    expect((await usersApi.list()).find((item) => item.id === user.id)?.enabled).toBe(false)
    await usersApi.remove(user.id)
    expect(await usersApi.list()).toEqual(before)
  })
  it('重复邮箱不能覆盖已有数据', async () => {
    const users = await usersApi.list()
    const user = users[0]!
    // .rejects 断言 Promise 被拒绝；必须 await，否则测试可能在断言完成前退出。
    await expect(usersApi.create({ ...user, email: user.email.toUpperCase() })).rejects.toThrow(
      '邮箱已存在',
    )
    expect(await usersApi.list()).toEqual(users)
  })
  it('损坏的本地数据被报告而不是静默覆盖', async () => {
    storage.set(USERS_KEY, '[{"id":"bad"}]')
    await expect(usersApi.list()).rejects.toThrow('用户数据格式')
    expect(storage.get(USERS_KEY)).toBe('[{"id":"bad"}]')
  })
})
