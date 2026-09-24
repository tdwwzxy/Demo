/** 学习路线页：主要练习 Props 类型、数组渲染、事件回调和条件样式。 */
import { useState } from 'react'
import { lessons } from '../data/lessons'

// completed 是字符串数组；toggle / openLab 是函数类型，void 表示不使用其返回值。
// (id: string) => void 类似 Consumer<String>；() => void 类似 Runnable 的调用形状。
type Props = { completed: string[]; toggle: (id: string) => void; openLab: () => void }
// { completed, toggle, openLab } 从 props 解构出三项；: Props 给整个对象标注类型。
export function Roadmap({ completed, toggle, openLab }: Props) {
  const [selected, setSelected] = useState('typescript')
  // ?? 只在查找结果为 null / undefined 时回退；后缀 ! 断言第 1 个章节存在。
  // 这个非空断言依赖 lessons 常量非空；若改成服务端加载，要显式处理空列表。
  const lesson = lessons.find((item) => item.id === selected) ?? lessons[0]!
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">JAVA DEVELOPER → FRONTEND BUILDER</span>
          <h1>
            从后端出发，
            <br />
            把想法写成<span>界面。</span>
          </h1>
          <p>
            用你熟悉的 Java 思维，理解现代前端。
            <br />
            六个小章节，一个能运行的用户管理项目。
          </p>
          {/* 传已有函数引用时直接写 openLab；写 openLab() 则会在渲染时立即执行。 */}
          <button className="primary" onClick={openLab}>
            打开交互实验 <span>↗</span>
          </button>
        </div>
        <div className="hero-code" aria-label="从 Java DTO 到 TypeScript 的代码示例">
          <div className="code-top">
            <span>
              <i />
              <i />
              <i />
            </span>
            <small>hello-frontend.tsx</small>
          </div>
          {/* pre 保留换行 / 空白；下面字符串里的 \n 表示换行，只是展示示例，不执行代码。 */}
          <pre>
            <span className="code-muted">{'// 你已经理解数据，现在让它可见。\n'}</span>
            <span className="code-purple">{'interface '}</span>
            {'Developer {\n  name: '}
            <span className="code-green">string</span>
            {'\n  direction: '}
            <span className="code-green">{"'full-stack'"}</span>
            {'\n}\n\n'}
            <span className="code-purple">{'function '}</span>
            {'Hello({ name }: Developer) {\n  '}
            <span className="code-purple">return</span>
            {' <h1>你好，{name}</h1>\n}'}
          </pre>
          <div className="code-footer">
            <span>● TypeScript</span>
            <span>类型安全，从这里开始</span>
          </div>
        </div>
      </section>
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR LEARNING PATH</span>
          <h2>循序渐进，动手理解</h2>
        </div>
        <span className="muted">约 4 小时 · 6 个章节</span>
      </div>
      <div className="roadmap-grid">
        {/* map 的第二个参数 index 是从 0 开始的下标；这里只用于展示编号，不作为 key。 */}
        {/* aria-pressed 向辅助技术说明当前按钮是否选中，不负责更改 React 状态。 */}
        {lessons.map((item, index) => (
          <button
            key={item.id}
            className={`lesson-card ${selected === item.id ? 'selected' : ''}`}
            onClick={() => setSelected(item.id)}
            aria-pressed={selected === item.id}
          >
            <div className="lesson-top">
              <span className={`lesson-number ${completed.includes(item.id) ? 'done' : ''}`}>
                {completed.includes(item.id) ? '✓' : `0${index + 1}`}
              </span>
              <span className="tag">{item.tag}</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.subtitle}</p>
            <div className="lesson-bottom">
              <span>{item.time}</span>
              <span>{selected === item.id ? '正在阅读' : '查看章节'} →</span>
            </div>
          </button>
        ))}
      </div>
      <section className="lesson-detail" aria-labelledby="lesson-title">
        <div className="lesson-explanation">
          <span className="eyebrow">READ → TRY → UNDERSTAND</span>
          <h2 id="lesson-title">{lesson.title}</h2>
          <h4>用 Java 经验理解</h4>
          <p>{lesson.java}</p>
          <h4>需要建立的新思维</h4>
          <p>{lesson.concept}</p>
          <div className="exercise">
            <strong>动手练习</strong>
            <p>{lesson.exercise}</p>
          </div>
          <button
            className={completed.includes(lesson.id) ? 'secondary' : 'primary'}
            onClick={() => toggle(lesson.id)}
          >
            {completed.includes(lesson.id) ? '✓ 已完成 · 点击撤销' : '标记本章完成'}
          </button>
        </div>
        <div className="lesson-code">
          <div className="snippet-title">{lesson.file}</div>
          {/* lesson.code 是字符串，React 按文本显示其中的 <...>，不会当成 HTML 执行。 */}
          <pre>
            <code>{lesson.code}</code>
          </pre>
          <p>打开对应源码阅读注释，再试着改动它。</p>
        </div>
      </section>
    </>
  )
}
