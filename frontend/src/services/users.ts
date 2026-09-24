/**
 * 第 5 站：数据访问层。UI 不关心数据来自 localStorage 还是 HTTP。
 * 本文件导出的是带方法的普通对象，不是由 Spring 创建的 Service 类。
 */
// 普通 import 引入运行时函数；import type 引入的 DTO 类型只在编译时使用。
import { isUser, parseUsers, validateUser } from '../domain/user'
import type { User, UserInput } from '../domain/user'
import { request } from './http'

// .env 自定义变量读出为字符串；不能用 Boolean('false') 判断，因为非空字符串为真。
// 没设置时是 undefined，也不等于字符串 'false'，因此默认模拟模式。
export const isMockMode = import.meta.env.VITE_USE_MOCK !== 'false'
// localStorage 是按站点来源隔离的浏览器键值存储，键和值都保存为字符串。
export const USERS_KEY = 'frontend-lab.users.v1'
// 数组字面量 [] 内是对象字面量 {}，相当于准备一组示例 DTO；无需调用构造器。
const seeds: User[] = [
  { id: 1, name: '林知夏', email: 'zhixia@example.com', role: 'ADMIN', enabled: true },
  { id: 2, name: '陈序', email: 'chenxu@example.com', role: 'DEVELOPER', enabled: true },
  { id: 3, name: '周予安', email: 'yuan@example.com', role: 'VIEWER', enabled: false },
]

function load(): User[] {
  // getItem 返回 string | null。null 表示这个键还没有数据。
  const raw = localStorage.getItem(USERS_KEY)
  // map 返回新数组；箭头函数后用 ({ ...user }) 的圆括号表示「返回对象字面量」。
  // 每个对象做浅拷贝，避免修改示例常量；已有字符串先 JSON.parse，再做运行时校验。
  return raw === null ? seeds.map((user) => ({ ...user })) : parseUsers(JSON.parse(raw))
}
function save(users: User[]) {
  // JSON.stringify 把对象转成 JSON 字符串；这不是写数据库，也不跨浏览器同步。
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}
function parseUser(value: unknown): User {
  // 校验函数返回 false 时抛 Error；async 调用链中的异常会变为 rejected Promise。
  if (!isUser(value)) throw new Error('返回的用户数据不合法。')
  return value
}
// 无参数箭头函数；new Promise 接收 executor，resolve 表示完成。
// setTimeout 250 毫秒后调用 resolve，用来模拟等待；这里不阻塞浏览器线程。
const delay = () => new Promise((resolve) => setTimeout(resolve, 250))

// UI 只调用 service：切换真实后端时无需改写组件。
export const usersApi = {
  // async list() 是对象方法简写；返回类型是「异步得到 User 数组」。
  async list(): Promise<User[]> {
    // await 后先得到 ApiResponse<User[]>，圆括号包住它，再读取 .data。
    if (!isMockMode) return (await request('/users', parseUsers)).data
    await delay()
    return load()
  },
  async create(input: UserInput): Promise<User> {
    // 先校验再执行；字符串错误为真值，null 为假值。
    const error = validateUser(input)
    if (error) throw new Error(error)
    // 先复制全部输入，再覆盖标准化字段；原 input 对象不会被改动。
    const normalized = { ...input, name: input.name.trim(), email: input.email.trim() }
    if (!isMockMode)
      return (
        await request('/users', parseUser, {
          method: 'POST',
          // HTTP 的 body 需要可传输内容，不能直接塞一个普通 JS 对象。
          body: JSON.stringify(normalized),
        })
      ).data
    await delay()
    const users = load()
    // some 类似 Stream.anyMatch：只要一个元素符合条件，就返回 true。
    if (users.some((user) => user.email.toLowerCase() === normalized.email.toLowerCase()))
      throw new Error('邮箱已存在。')
    // map 提取 ID；函数参数里的 ... 把数组展开为多个参数：Math.max(0, 1, 2, 3)。
    // 这里只为小规模教学数据生成 ID，真实系统的 ID 应由后端负责。
    const user: User = { ...normalized, id: Math.max(0, ...users.map((item) => item.id)) + 1 }
    // 数组展开创建一个新数组，把新用户接在末尾；不是 previous.push(...) 原地修改。
    save([...users, user])
    return user
  },
  async update(id: number, input: UserInput): Promise<User> {
    const error = validateUser(input)
    if (error) throw new Error(error)
    // 对象末尾的 id 是属性简写，等同于 id: id。
    const updated = { ...input, name: input.name.trim(), email: input.email.trim(), id }
    if (!isMockMode)
      return (
        await request(`/users/${id}`, parseUser, {
          method: 'PUT',
          body: JSON.stringify(input),
        })
      ).data
    await delay()
    const users = load()
    if (!users.some((user) => user.id === id)) throw new Error('用户不存在。')
    if (
      users.some(
        // 排除正在编辑的本人，再判断是否与其他用户的邮箱冲突。
        (user) => user.id !== id && user.email.toLowerCase() === updated.email.toLowerCase(),
      )
    )
      throw new Error('邮箱已存在。')
    // map 对命中的元素返回新对象，其余返回原对象引用；整个数组仍是新数组。
    save(users.map((user) => (user.id === id ? updated : user)))
    return updated
  },
  // Promise<void> 表示只关心操作是否完成，没有业务返回值，类似异步的 void 方法。
  async remove(id: number): Promise<void> {
    if (!isMockMode) {
      // () => undefined 忽略 data 内容；HTTP 层仍要求响应是包含 data 的 JSON。
      await request(`/users/${id}`, () => undefined, { method: 'DELETE' })
      return
    }
    await delay()
    // filter 保留 ID 不相等的用户，从而得到删除后的新数组。
    save(load().filter((user) => user.id !== id))
  },
}
