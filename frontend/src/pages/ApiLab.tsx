/** 接口调试页：先看 RequestState 的建模，再跟踪 run() 的异步控制流。 */
import { useState } from 'react'
import { isMockMode, usersApi } from '../services/users'
import type { User } from '../domain/user'

// 可辨识联合类型：每个分支都有不同的 status 字面量，TS 据此确定可访问哪些字段。
// 类似 Java sealed interface + 多个 record；不会生成这些 Java 风格的运行时类。
// 例如 loading 分支没有 data，只有检查 state.status === 'success' 后才能访问 data。
type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User[]; elapsed: number }
  | { status: 'error'; message: string; elapsed: number }

export function ApiLab() {
  // 显式写 <RequestState>，否则初始值只能推导出 { status: string }，不足以约束整个状态机。
  const [state, setState] = useState<RequestState>({ status: 'idle' })
  async function run(fail: boolean) {
    // 设置 loading 后让 UI 显示等待状态；setter 不会立即改变本次函数里的 state 变量。
    setState({ status: 'loading' })
    // performance.now() 是适合测耗时的高精度计时，不是日期时间戳。
    const start = performance.now()
    try {
      if (fail) {
        // 定时器到了就 resolve；await 等待 Promise 完成后再抛模拟异常，方便观察 loading。
        await new Promise((resolve) => setTimeout(resolve, 400))
        throw new Error('这是主动模拟的接口错误，用于练习错误状态。')
      }
      // Service 返回 Promise<User[]>；await 后的 data 才是 User[]，而不是 Promise 对象。
      const data = await usersApi.list()
      setState({ status: 'success', data, elapsed: Math.round(performance.now() - start) })
    } catch (cause) {
      // JavaScript 甚至可以 throw 字符串，因此不能假定捕获到的一定是 Error。
      // instanceof 在运行时检查 Error；TS 随之允许读取 cause.message。
      setState({
        status: 'error',
        message: cause instanceof Error ? cause.message : '未知错误',
        elapsed: Math.round(performance.now() - start),
      })
    }
  }
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">FROM SERVICE TO BROWSER</span>
        <h1>让每一次请求，都有回应。</h1>
        <p>观察异步状态，熟悉前后端之间的数据契约。</p>
      </div>
      <div className="two-columns">
        <section className="panel">
          <span className="tag">{isMockMode ? '本地模拟 · 不发送 HTTP' : '真实 HTTP 请求'}</span>
          <h2>用户列表接口</h2>
          <div className="endpoint">
            <strong>GET</strong>
            <code>{import.meta.env.VITE_API_BASE_URL || '/api'}/users</code>
          </div>
          <p className="muted">
            成功响应统一为 <code>{'{ data, message }'}</code>。进入真实模式后，可以在浏览器 Network
            面板观察请求。
          </p>
          <div className="button-row">
            {/* void run(false) 启动异步操作但不向事件系统返回 Promise；不会让它同步完成。 */}
            {/* void 也不会自动捕获异常，这里依靠 run 内部的 try/catch。 */}
            <button
              className="primary"
              disabled={state.status === 'loading'}
              onClick={() => void run(false)}
            >
              {state.status === 'loading' ? '请求中…' : '获取用户'}
            </button>
            <button
              className="secondary"
              disabled={state.status === 'loading'}
              onClick={() => void run(true)}
            >
              模拟失败
            </button>
          </div>
          <div className="request-flow">
            <span>Component</span>
            <b>→</b>
            <span>Service</span>
            <b>→</b>
            <span>{isMockMode ? 'localStorage' : 'Spring Boot'}</span>
          </div>
          <p className="note">
            源码：src/services/http.ts · 包含超时、HTTP 状态判断和运行时数据校验。
          </p>
        </section>
        <section className="panel response-panel">
          <div className="panel-heading">
            <h2>响应预览</h2>
            <span className={`request-status ${state.status}`} aria-live="polite">
              {state.status}
              {/* in 运算符缩小联合类型：只有完成 / 失败的分支才具有 elapsed 属性。 */}
              {'elapsed' in state ? ` · ${state.elapsed} ms` : ''}
            </span>
          </div>
          {/* JSON.stringify(value, null, 2)：不做自定义替换，并用两个空格缩进，便于阅读。 */}
          {/* 嵌套三元依次选择成功、失败、加载、初始状态；这里每个分支都返回展示字符串。 */}
          <pre aria-live="polite">
            {state.status === 'success'
              ? JSON.stringify({ data: state.data, message: 'ok' }, null, 2)
              : state.status === 'error'
                ? JSON.stringify({ error: state.message }, null, 2)
                : state.status === 'loading'
                  ? '// 等待响应…'
                  : '// 点击「获取用户」开始。'}
          </pre>
        </section>
      </div>
      <section className="panel connect-guide">
        <h2>接入 Spring Boot，只需三步</h2>
        <div className="connection-steps">
          <div>
            <span>01</span>
            <h3>准备接口</h3>
            <p>按照 docs/SPRING_BOOT.md 实现 /api/users 的 CRUD 契约。</p>
          </div>
          <div>
            <span>02</span>
            <h3>切换环境</h3>
            <p>复制 .env.example 为 .env.local，设置 VITE_USE_MOCK=false。</p>
          </div>
          <div>
            <span>03</span>
            <h3>重启并联调</h3>
            <p>运行 pnpm dev，检查代理目标端口，打开 Network 查看 HTTP 请求。</p>
          </div>
        </div>
      </section>
    </>
  )
}
