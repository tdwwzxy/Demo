/**
 * 第 2 站：最适合逐行学习的 React 文件。
 * 数据流：用户操作 → 事件回调 → setXxx → React 重新调用组件 → 更新必要的 DOM。
 * 不要把组件函数当成只执行一次的构造器，也不要把局部变量当成 Spring 单例字段。
 */
import { useState } from 'react'

export function ReactLab() {
  // useState 返回二元数组。解构后 count 是当前渲染的值，setCount 是更新函数。
  // 初始值 0 让 TypeScript 推导 count 为 number；后续渲染会保留状态而非重新归零。
  const [count, setCount] = useState(0)
  // 同理自动推导 string 和 boolean；各个状态相互独立，组件重新挂载时才重新初始化。
  const [name, setName] = useState('Java 开发者')
  const [enabled, setEnabled] = useState(true)
  return (
    <>
      {/* <>...</> 是 Fragment：把多个兄弟元素作为一组返回，不额外生成 div。 */}
      <div className="page-intro">
        <span className="eyebrow">REACT PLAYGROUND</span>
        <h1>状态变了，界面就变了。</h1>
        <p>点击、输入、切换，观察一次渲染是如何发生的。</p>
      </div>
      <div className="two-columns">
        <section className="panel">
          <span className="tag">01 · useState</span>
          <h2>组件的记忆</h2>
          <p className="muted">每次更新都会请求 React 重新渲染。</p>
          <div className="counter" aria-live="polite">
            {/* JSX 的 {} 求表达式值；React 安全地按文本渲染数字，不需要手动 innerHTML。 */}
            {count}
          </div>
          <div className="button-row">
            {/* 外层箭头是点击回调；内层箭头是状态更新器：拿到前一个状态，再计算新值。 */}
            <button className="secondary" onClick={() => setCount((value) => value - 1)}>
              −1
            </button>
            <button className="primary" onClick={() => setCount((value) => value + 1)}>
              +1
            </button>
            <button
              className="secondary"
              onClick={() => {
                // {} 函数体可写多条语句；这里排入 3 个更新函数，依次得到 1、2、3 的累加。
                // 若改成 3 次 setCount(count + 1)，都读取同一份渲染快照，效果不同。
                setCount((value) => value + 1)
                setCount((value) => value + 1)
                setCount((value) => value + 1)
              }}
            >
              连续 +3
            </button>
            <button className="text-button" onClick={() => setCount(0)}>
              重置
            </button>
          </div>
          <pre className="small-code">{'setCount(previous => previous + 1)'}</pre>
          <p className="note">
            想一想：连续三次 setCount(count + 1) 为什么可能只增加
            1？当前事件处理函数读取的是同一次渲染的状态快照。
          </p>
        </section>
        <section className="panel">
          <span className="tag">02 · 受控表单 + Props</span>
          <h2>数据驱动的预览</h2>
          <label className="field">
            你的称呼
            {/* value 由状态控制，onChange 把输入值写回状态，二者组成「受控输入」。 */}
            {/* maxLength={30} 传数字；maxLength="30" 是字符串写法，不符合此属性的 TS 类型。 */}
            {/* event 是 React 提供的事件对象；当前 input 的 value 是字符串。 */}
            <input value={name} maxLength={30} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="checkbox-field">
            {/* 复选框用 checked 而非 value；event.target.checked 才是勾选后的 boolean。 */}
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            显示欢迎卡片
          </label>
          {/* 条件渲染：表达式只能放一个结果，三元表达式适合两个分支；不能直接放 if 语句。 */}
          {enabled ? (
            <Greeting name={name} />
          ) : (
            <div className="empty-state">卡片已隐藏，再勾选即可显示。</div>
          )}
          <pre className="small-code">
            {'<Greeting name={name} />\n// 父组件传数据，子组件负责呈现。'}
          </pre>
        </section>
      </div>
      <div className="tip">
        <strong>下一步</strong>
        <span>打开 src/pages/ReactLab.tsx，给计数器增加步长参数，并将计数器拆成独立组件。</span>
      </div>
    </>
  )
}
// 子组件只负责展示；name 是父组件传进来的只读输入，无需在子组件复制为 useState。
function Greeting({ name }: { name: string }) {
  return (
    <div className="greeting">
      <span>HELLO, FRONTEND</span>
      {/* || 会在空字符串等假值时取右侧；trim 后为空，就用默认称呼。 */}
      <h3>你好，{name.trim() || '新同学'} 👋</h3>
      <p>这段文字来自父组件的 Props。</p>
    </div>
  )
}
