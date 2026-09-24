/**
 * 应用骨架：左侧导航 + 当前页面。先理解「状态决定渲染什么」。
 * 本例不用路由库，page 是组件内的状态，不会修改浏览器 URL。
 */
import { useState } from 'react'
import { Roadmap } from './pages/Roadmap'
import { ReactLab } from './pages/ReactLab'
import { UsersPage } from './pages/UsersPage'
import { ApiLab } from './pages/ApiLab'
import { useProgress } from './hooks/useProgress'
import { lessons } from './data/lessons'
import { isMockMode } from './services/users'
import './App.css'

// 用数据描述导航，再 map 成组件；比为每一项复制同一段 JSX 更容易维护。
const pages = [
  { id: 'roadmap', icon: '◫', title: '学习路线', sub: '从熟悉到掌握' },
  { id: 'react', icon: '⌘', title: '交互实验', sub: '理解 React 状态' },
  { id: 'users', icon: '♧', title: '用户管理', sub: '完成第一个 CRUD' },
  { id: 'api', icon: '⇄', title: '接口调试', sub: '连接后端服务' },
] as const // const 断言保留具体字面量并产生只读类型，不是运行时 Object.freeze。
// 类型层的 typeof 获取 pages 的类型；[number] 获取任一元素的类型；['id'] 获取 id 类型。
// 最终得到 'roadmap' | 'react' | 'users' | 'api'，新增导航时不必再维护一份联合类型。
type Page = (typeof pages)[number]['id']

// 函数组件：执行后返回描述 UI 的 React 元素。名字必须大写，才能与 div 等原生标签区分。
export default function App() {
  // useState<Page> 约束当前值和 setter 的参数；不会允许 setPage('不存在的页面')。
  const [page, setPage] = useState<Page>('roadmap')
  // 对象解构从自定义 Hook 返回值中取出字段，不是调用两个独立的方法。
  const { completed, toggle } = useProgress()
  // 派生值直接计算，不另建 useState；这样不会出现「完成数更新了，百分比忘记更新」。
  const percent = Math.round((completed.length / lessons.length) * 100)
  // return (...) 的圆括号用于包住多行表达式；内部是 JSX，不是字符串模板。
  return (
    <div className="app-shell">
      {/* className 对应 HTML 的 class。JSX 中的注释写成「花括号包住块注释」。 */}
      <aside className="sidebar">
        <a href="#main" className="skip-link">
          跳到主要内容
        </a>
        <div className="brand">
          <span className="brand-mark">
            f<span>.</span>
          </span>
          <div>
            Frontend Lab<small>JAVA 开发者的前端起点</small>
          </div>
        </div>
        <div className="sidebar-label">学习工作台</div>
        <nav aria-label="学习导航">
          {/* {} 在 JSX 中切回 JS 表达式；map 返回一组元素，React 会依次渲染。 */}
          {/* key 是同级列表的稳定标识；className 中的反引号可按当前状态拼接 CSS 类。 */}
          {/* onClick 接收函数；() => setPage(...) 是点击时才执行，不能写成直接调用。 */}
          {pages.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'current' : ''}`}
              aria-current={page === item.id ? 'page' : undefined}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>
                {item.title}
                <small>{item.sub}</small>
              </span>
              {/* boolean && JSX：条件为 true 才显示右边。避免用可能为 0 的数字作条件。 */}
              {page === item.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-progress">
          <div>
            <strong>你的学习进度</strong>
            <span>{percent}%</span>
          </div>
          <progress value={completed.length} max={lessons.length} aria-label="学习完成进度" />
          <small>
            已完成 {completed.length} / {lessons.length} 个章节
          </small>
          <p>
            不用一次学完，
            <br />
            每次写懂一点就很好。
          </p>
        </div>
        <div className="sidebar-footer">
          <span className="java-avatar">J</span>
          <div>
            从 Java，到全栈<small>BUILD SOMETHING REAL</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="muted">工作台</span>
            <span className="breadcrumb">/</span>
            {/* find 返回第一个匹配项或 undefined；?. 是可选链，未找到时不访问 title。 */}
            <strong>{pages.find((item) => item.id === page)?.title}</strong>
          </div>
          <div className="topbar-right">
            <span className="mode-label">
              <i />
              {isMockMode ? '本地模拟' : '真实接口'}
            </span>
            <span className="version-pill">LEARNING EDITION</span>
          </div>
        </header>
        <main id="main">
          <div className="stack-strip">
            <span>YOUR STACK</span>
            <b className="ts-logo">TS</b>
            <span>TypeScript</span>
            <b className="react-logo">⚛</b>
            <span>React</span>
            <b className="vite-logo">ϟ</b>
            <span>Vite</span>
            <b className="pnpm-logo">▦</b>
            <span>pnpm</span>
          </div>
          {/* Props 像函数参数：completed 是数据，toggle / openLab 是回调函数。 */}
          {/* 切换页面后未选中的组件卸载，所以表单等局部状态会重新初始化。 */}
          {page === 'roadmap' && (
            <Roadmap completed={completed} toggle={toggle} openLab={() => setPage('react')} />
          )}
          {page === 'react' && <ReactLab />}
          {page === 'users' && <UsersPage />}
          {page === 'api' && <ApiLab />}
          <footer className="main-footer">
            <span>边读源码，边改代码，边看变化。</span>
            <span>TypeScript · React · Vite · pnpm</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
