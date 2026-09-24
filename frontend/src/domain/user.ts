/**
 * 第 1 站：数据类型与纯函数。建议先读本文件，再读 ReactLab.tsx。
 * .ts 表示 TypeScript；它在 JavaScript 上增加编译期类型检查。
 * export 类似「把成员公开给其他模块」；其他文件用 import 引入。
 * 本项目省略语句末尾的分号，这是统一的格式约定，不是省略类型检查。
 */
// type 定义类型别名；| 是联合类型，表示「三种值中的一种」。
// 字符串字面量类型比 string 更具体，可类比 Java enum 的取值约束，但不生成枚举类。
export type Role = 'ADMIN' | 'DEVELOPER' | 'VIEWER'

// interface 描述对象必须具有的属性，类似 Java DTO 的形状，但不需要 new User()。
// TypeScript 使用结构类型：形状符合即可；interface 本身编译后不会保留。
export interface User {
  // 属性名: 类型。number 通常是双精度浮点数，不区分 Java 的 int / double。
  // Java long ID 若超出 JS 安全整数范围，应改用字符串；这里运行时会检查安全整数。
  id: number
  // string / boolean 是基本类型，习惯上使用小写而不是包装类型 String / Boolean。
  name: string
  email: string
  role: Role
  enabled: boolean
}

// Omit<T, K> 是内置泛型工具：从 T 中去掉 K 属性，只生成新类型，不删除对象字段。
// 类似手写一个不含 id 的 CreateUserRequest；不必重复其余属性声明。
export type UserInput = Omit<User, 'id'>
// <T> 是类型参数，类似 Java ApiResponse<T>；这里 { ... } 直接描述对象结构。
export type ApiResponse<T> = { data: T; message: string }

// const 固定变量绑定，类似 final 引用；它并不会让对象内部自动不可变。
// Record<K, V> 要求每个 K 键都对应 V 值；这里是普通对象，不是 Java Map 实例。
export const roleLabels: Record<Role, string> = {
  ADMIN: '管理员',
  DEVELOPER: '开发者',
  VIEWER: '观察者',
}

// unknown 表示「还不知道类型」；与 any 不同，使用属性前必须先做检查。
// 返回位置的 value is User 是「类型谓词」：返回 true 后，TS 可把 value 缩小为 User。
export function isUser(value: unknown): value is User {
  // typeof 是 JS 的运行时运算符。特别注意：typeof null 也是 'object'，所以要单独排除。
  if (typeof value !== 'object' || value === null) return false
  // as 是编译期断言，不会转换或校验数据。这里只断言为可按字符串键读取的对象；
  // 每个属性仍是 unknown，下面逐项检查后才会认定为 User。
  const user = value as Record<string, unknown>
  // && 表示所有条件都通过；会短路。=== / !== 是严格比较，不隐式转换字符串和数字。
  return (
    Number.isSafeInteger(user.id) &&
    Number(user.id) > 0 &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    (user.role === 'ADMIN' || user.role === 'DEVELOPER' || user.role === 'VIEWER') &&
    typeof user.enabled === 'boolean'
  )
}

// User[] 是数组类型，可读作 Array<User>；: User[] 声明函数返回类型。
export function parseUsers(value: unknown): User[] {
  // Array.isArray 是运行时数组判断；every 相当于 Stream.allMatch。
  // every(isUser) 把函数作为参数传入，不是立即调用 isUser()。
  if (!Array.isArray(value) || !value.every(isUser)) {
    throw new Error('用户数据格式不符合约定，请检查接口响应或清除损坏的练习数据。')
  }
  // 前面的检查完成了类型收窄，因此这里不需要写 as User[]。
  return value
}

// string | null：有错返回字符串，无错返回 null；开启 strict 后必须处理这两种情况。
export function validateUser(input: UserInput): string | null {
  // trim() 返回去除首尾空白的新字符串；length 是属性，不是 Java 的 length() 方法。
  if (input.name.trim().length < 2 || input.name.trim().length > 30) return '姓名需要 2–30 个字符。'
  // /.../ 是正则字面量；^ / $ 限定开头结尾，\s 表示空白，+ 表示至少一次。
  // 正则的 test(...) 返回 boolean；前面的 ! 表示取反。这只是教学级邮箱格式校验。
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return '请输入有效的邮箱地址。'
  // hasOwn 只检查对象自身的键，避免把原型链上的属性误当成角色。
  if (!Object.hasOwn(roleLabels, input.role)) return '请选择有效角色。'
  return null
}

export function filterUsers(users: User[], keyword: string, role: Role | 'ALL'): User[] {
  // role 比业务角色多一个 ALL，只作为筛选条件，不写入 User.role。
  const query = keyword.trim().toLowerCase()
  // filter 返回新数组，不修改原数组；(user) => ... 是箭头函数，类似 Java lambda。
  // 箭头后没有 {} 时，表达式结果被隐式 return。
  return users.filter(
    (user) =>
      (role === 'ALL' || user.role === role) &&
      // 反引号是模板字符串，${...} 插值；includes 判断字符串包含关系。
      `${user.name} ${user.email}`.toLowerCase().includes(query),
  )
}
