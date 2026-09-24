/**
 * 最小组件示例。{ enabled } 是对象解构，取出 props.enabled。
 * 后面的 : { enabled: boolean } 是整个参数对象的类型，不是默认值。
 * 可想成先接收 props，再写 const enabled = props.enabled。
 */
export function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    // 外层 {} 放 JS 表达式，内层模板字符串用 ${...} 插值，两层花括号作用不同。
    <span className={`status-badge ${enabled ? 'active' : ''}`}>
      {/* i 只是用 CSS 画状态圆点；三元表达式决定显示的文案。 */}
      <i />
      {enabled ? '已启用' : '已停用'}
    </span>
  )
}
