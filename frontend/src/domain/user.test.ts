/** 测试语法入门：describe 类似测试分组，it 类似一条 @Test，expect 类似断言工具。 */
import { describe, expect, it } from 'vitest'
import { filterUsers, parseUsers, validateUser } from './user'
import type { User } from './user'

// 测试夹具：用一个合法 DTO 作为基准，再通过 ...user 覆盖单个字段制造异常。
const user: User = {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
  role: 'DEVELOPER',
  enabled: true,
}
describe('用户数据契约', () => {
  it('拒绝编译器无法发现的异常网络数据', () => {
    // toThrow 要接收「稍后执行的函数」，所以写 () => parseUsers(...)，避免提前抛出异常。
    expect(() => parseUsers([{ ...user, id: '1' }])).toThrow()
    expect(() => parseUsers([{ ...user, role: 'ROOT' }])).toThrow()
    expect(() => parseUsers(null)).toThrow()
    // toEqual 按结构比较数组 / 对象，不要求是同一个引用。
    expect(parseUsers([user])).toEqual([user])
  })
  it('校验空白姓名和邮箱，接受合法输入', () => {
    // .not 是断言取反；toBeNull 检查 null，与 undefined 不同。
    expect(validateUser({ ...user, name: '  ' })).not.toBeNull()
    expect(validateUser({ ...user, email: 'invalid' })).not.toBeNull()
    expect(validateUser(user)).toBeNull()
  })
  it('搜索忽略大小写且与角色条件组合，不改变原数组', () => {
    // as const 把 'VIEWER' 保持为字面量类型，否则对象属性可能被推导成宽泛的 string。
    const original = [user, { ...user, id: 2, role: 'VIEWER' as const }]
    expect(filterUsers(original, ' ALICE@ ', 'DEVELOPER')).toEqual([user])
    expect(filterUsers(original, 'nobody', 'ALL')).toEqual([])
    // 验证 filter 没有修改原数组长度；测试行为而非复写实现。
    expect(original).toHaveLength(2)
  })
})
