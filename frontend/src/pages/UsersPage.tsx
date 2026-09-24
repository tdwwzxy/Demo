/**
 * 第 5 站：完整业务页面。建议按「状态 → 加载 → 提交 → JSX 表单」的顺序阅读。
 * 页面相当于 UI 协调层，调用 usersApi 数据服务；不要把浏览器校验当成后端鉴权。
 * 阅读主线：用户输入 → setForm → submit → usersApi → setUsers → 表格重新渲染。
 */
// useState 保存会影响界面的值；useEffect 同步外部数据；useRef 保存不触发渲染的引用。
import { useEffect, useRef, useState } from 'react'
// FormEvent 是 React 事件的类型，只参与编译检查，不是运行时的构造器。
import type { FormEvent } from 'react'
import { filterUsers, roleLabels, validateUser } from '../domain/user'
import type { Role, User, UserInput } from '../domain/user'
import { isMockMode, usersApi } from '../services/users'
import { StatusBadge } from '../components/StatusBadge'

// 模块级常量在组件外声明，避免每次渲染创建；后面始终复制更新，不直接修改它。
const emptyForm: UserInput = { name: '', email: '', role: 'DEVELOPER', enabled: true }
export function UsersPage() {
  // [] 没有元素可供推导，写 <User[]> 明确「用户数组」；setter 接受新数组或更新函数。
  const [users, setUsers] = useState<User[]>([])
  // loading 负责读取列表；busy 负责新增 / 编辑 / 删除期间禁用操作。
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  // 空字符串表示不显示提示，非空字符串就是提示内容；类型由初始值推导为 string。
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  // reload 不是请求数据，而是递增的「重新加载信号」，被下方 Effect 作为依赖。
  const [reload, setReload] = useState(0)
  // keyword / role 是筛选条件；实际过滤结果在函数末尾即时计算。
  const [keyword, setKeyword] = useState('')
  const [role, setRole] = useState<Role | 'ALL'>('ALL')
  // 一个状态对象保存表单全部字段，可类比一个请求 DTO，但更改它必须通过 setter。
  const [form, setForm] = useState<UserInput>(emptyForm)
  // number | null 区分「正在编辑哪个 ID」和「新增模式」，不能仅用 if(editing) 模糊判断。
  const [editing, setEditing] = useState<number | null>(null)
  // 保存等待二次确认的行 ID；点击「删除」本身还没有执行删除请求。
  const [deleteId, setDeleteId] = useState<number | null>(null)
  // HTMLInputElement 来自 DOM 类型库；React 挂载输入框后把真实元素放到 current。
  // ref.current 的变化不触发重新渲染；useRef 对象在该组件实例的重渲染间保持稳定。
  const nameInput = useRef<HTMLInputElement>(null)

  // 初次挂载以及 reload 改变后运行。Effect 回调不是 async，因为它应返回清理函数或不返回。
  useEffect(() => {
    // let 允许重新赋值；每次 Effect 执行有自己的 active，被 then/catch 的闭包共享。
    let active = true
    usersApi
      .list()
      // then 接收成功结果，类似 CompletableFuture.thenAccept。
      .then((data) => {
        // 只有这轮 Effect 仍有效时，才允许响应更新状态。
        if (active) setUsers(data)
      })
      // catch 处理读取失败；unknown 强制我们先检查是否为 Error。
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : '加载失败')
      })
      // 成功或失败最后都会收起 loading；不要只在成功分支处理，否则出错会一直转圈。
      .finally(() => {
        if (active) setLoading(false)
      })
    // 返回的是清理函数，不是立即执行；下一轮 Effect 前 / 组件卸载时 React 调用它。
    // 这会忽略旧响应，但不会取消网络请求。真正取消要向 fetch 传 AbortSignal。
    return () => {
      active = false
    }
  }, [reload]) // React 比较依赖是否变化；模块常量 usersApi 和稳定的 setter 不必列入。

  // 泛型 FormEvent<HTMLFormElement> 表示「来自 form 的提交事件」。
  async function submit(event: FormEvent<HTMLFormElement>) {
    // 防止浏览器默认提交表单并整页刷新；前端改用 JS 调用接口。
    event.preventDefault()
    const validation = validateUser(form)
    if (validation) {
      // return 提前结束；async 中 return 没有值时最终得到 Promise<void>。
      setError(validation)
      return
    }
    // 开始一轮操作：禁用提交，并清除上一次错误 / 成功提示。
    setBusy(true)
    setError('')
    setNotice('')
    try {
      // 同一张表单处理新增和编辑，editing 为 null 时 POST，否则 PUT。
      // await 在该函数内等待，不阻塞输入之外的整个浏览器。
      const saved =
        editing === null ? await usersApi.create(form) : await usersApi.update(editing, form)
      // 函数式更新以最新列表为基础。新增用数组展开；编辑用 map 替换命中的元素。
      // 每个异步处理函数捕获了触发它那次渲染的 editing / form（闭包的状态快照）。
      setUsers((previous) =>
        editing === null
          ? [...previous, saved]
          : previous.map((user) => (user.id === editing ? saved : user)),
      )
      setNotice(editing === null ? '用户已创建。' : '用户已更新。')
      // 保存成功后恢复空表单并切回新增模式；失败则保留输入，便于用户修正。
      setForm(emptyForm)
      setEditing(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      // 无论成功还是失败，都重新允许操作。finally 与 Java 的用途相近。
      setBusy(false)
    }
  }
  // 由确认按钮触发的异步删除；先等服务成功，再更新界面，失败时保留该行。
  async function remove(id: number) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await usersApi.remove(id)
      // filter 返回新数组，保留所有「不是这个 ID」的行；原数组不被修改。
      setUsers((previous) => previous.filter((user) => user.id !== id))
      if (editing === id) {
        setEditing(null)
        setForm(emptyForm)
      }
      setDeleteId(null)
      setNotice('用户已删除。')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '删除失败')
    } finally {
      setBusy(false)
    }
  }
  // 编辑按钮只把现有数据填进表单，真正保存发生在 submit，不会立刻请求后端。
  function edit(user: User) {
    setEditing(user.id)
    setForm({ name: user.name, email: user.email, role: user.role, enabled: user.enabled })
    setError('')
    setNotice('')
    setDeleteId(null)
    // ?. 可选链：输入框还没挂载时 current 为 null，不调用 focus，避免异常。
    nameInput.current?.focus()
  }
  // 派生状态：由 users、keyword、role 决定。不要再建一份 visibleUsers 状态去同步。
  const visibleUsers = filterUsers(users, keyword, role)
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">BUILD A COMPLETE FEATURE</span>
        <h1>你的第一个 CRUD 页面。</h1>
        <p>用熟悉的业务场景，串起类型、组件、状态和数据访问。</p>
      </div>
      <div className="tip">
        <strong>{isMockMode ? '本地模拟模式' : '真实接口模式'}</strong>
        <span>
          {isMockMode
            ? '练习数据保存在当前浏览器，刷新后仍会保留；仅用于学习。'
            : '当前连接配置的后端，增删改操作会修改后端数据。'}
        </span>
      </div>
      {/* JSX 的 && 常用于「有内容才显示」。这里 error 是字符串，空字符串不显示元素。 */}
      {/* role="alert" / role="status" 是无障碍提示，不是业务用户的 Role 类型。 */}
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert success" role="status">
          {notice}
        </div>
      )}
      <div className="crud-layout">
        <section className="panel users-panel">
          <div className="panel-heading">
            <h2>
              用户列表 <small>{users.length}</small>
            </h2>
            {/* disabled={...} 传 boolean；刷新按钮更改 reload，由 Effect 统一重新取数据。 */}
            <button
              className="text-button"
              disabled={loading || busy}
              onClick={() => {
                // 点击后先显示加载，再增加 reload；改变状态不是手动操作 DOM。
                setLoading(true)
                setError('')
                setReload((value) => value + 1)
              }}
            >
              刷新
            </button>
          </div>
          <div className="filters">
            {/* 搜索条件也是受控输入。修改 keyword 后会重渲染，重新计算 visibleUsers。 */}
            <label className="search-input">
              <span>⌕</span>
              <input
                aria-label="搜索用户"
                placeholder="搜索姓名或邮箱…"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </label>
            {/* DOM select 的 value 总是 string；这里用 as 收窄到受控 option 的值范围。 */}
            {/* as 不做运行时校验，不应直接用在不可信的后端 JSON 上。 */}
            <select
              aria-label="筛选角色"
              value={role}
              onChange={(event) => setRole(event.target.value as Role | 'ALL')}
            >
              <option value="ALL">全部角色</option>
              {/* Object.entries 把对象转成 [键, 值][]；([value, label]) 在参数处数组解构。 */}
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {/* loading 为真显示等待，为假显示表格；这是表达式形式的 if/else。 */}
          {loading ? (
            <div className="empty-state" role="status">
              正在加载用户…
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>用户</th>
                    <th>角色</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {/* map 的回调返回 JSX。key 用业务 ID，不用会随增删改变的数组下标。 */}
                  {visibleUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          {/* slice(0, 1) 取首个 UTF-16 单元，足够这里的常规姓名，不是通用 emoji 切分。 */}
                          <span className="avatar">{user.name.slice(0, 1)}</span>
                          <div>
                            <strong>{user.name}</strong>
                            <small>{user.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="role-badge">{roleLabels[user.role]}</span>
                      </td>
                      <td>
                        {/* 自定义组件接收 Props；enabled={...} 传变量值，不是字符串。 */}
                        <StatusBadge enabled={user.enabled} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            disabled={busy}
                            className="text-button"
                            aria-label={`编辑 ${user.name}`}
                            onClick={() => edit(user)}
                          >
                            编辑
                          </button>
                          <button
                            disabled={busy}
                            className="text-button danger"
                            aria-label={`删除 ${user.name}`}
                            onClick={() => setDeleteId(user.id)}
                          >
                            删除
                          </button>
                        </div>
                        {/* 只有当前行 ID 与待删除 ID 相等时，才显示它的确认区域。 */}
                        {deleteId === user.id && (
                          <div className="delete-confirm">
                            <span>确认删除？</span>
                            {/* void 忽略 Promise 返回值，异常由 remove 内部的 try/catch 处理。 */}
                            <button disabled={busy} onClick={() => void remove(user.id)}>
                              确认
                            </button>
                            <button disabled={busy} onClick={() => setDeleteId(null)}>
                              取消
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleUsers.length === 0 && (
                <div className="empty-state">没有匹配的用户。试试修改筛选条件或新增用户。</div>
              )}
            </div>
          )}
          <p className="table-foot">
            显示 {visibleUsers.length} 条 · 学习点：列表渲染、稳定 key、派生状态
          </p>
        </section>
        <section className="panel form-panel">
          <span className="tag">受控表单</span>
          <h2>{editing === null ? '新增用户' : '编辑用户'}</h2>
          {/* onSubmit 同时支持按钮提交和键盘 Enter；比只监听保存按钮的 onClick 更完整。 */}
          <form onSubmit={(event) => void submit(event)}>
            {/* fieldset 的 disabled 一次禁用内部表单控件，避免请求中重复提交或修改。 */}
            <fieldset disabled={busy || loading}>
              <label className="field">
                姓名
                {/* ref 连接 useRef；required 简写等价 required={true}。 */}
                {/* value 决定显示内容；onChange 用 ...form 保留其他字段，再覆盖 name。 */}
                {/* setForm({ name: ... }) 会缺少其他字段；对象状态 setter 不会自动合并。 */}
                <input
                  ref={nameInput}
                  required
                  minLength={2}
                  maxLength={30}
                  placeholder="例如：李明"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>
              <label className="field">
                邮箱
                {/* type="email" 启用浏览器基础校验；service / 后端校验仍必需。 */}
                <input
                  required
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </label>
              <label className="field">
                角色
                <select
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkbox-field">
                {/* checkbox 读取 checked（布尔值），其他文本输入读取 value（字符串）。 */}
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
                />
                启用此用户
              </label>
              {/* type="submit" 触发表单的 onSubmit；文案从 busy / editing 状态计算。 */}
              <button className="primary full-width" type="submit">
                {busy ? '正在保存…' : editing === null ? '＋ 创建用户' : '保存修改'}
              </button>
              {/* 取消按钮必须 type="button"，否则在 form 中可能触发默认提交。 */}
              {editing !== null && (
                <button
                  type="button"
                  className="secondary full-width"
                  onClick={() => {
                    setEditing(null)
                    setForm(emptyForm)
                  }}
                >
                  取消编辑
                </button>
              )}
            </fieldset>
          </form>
          <p className="note">界面校验提升体验；真实系统仍需要后端校验和权限控制。</p>
        </section>
      </div>
    </>
  )
}
