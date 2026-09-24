/** 第 3 站补充：自定义 Hook，把「状态 + 存储同步」封装成可复用逻辑。 */
import { useEffect, useState } from 'react'
import { lessons } from '../data/lessons'

const KEY = 'frontend-lab.progress.v1'
// use 开头是 Hook 的命名约定。只能在 React 组件 / 其他 Hook 顶层调用，不能放条件里。
// 每次调用有自己的状态，并不是 Java 单例；本例只由 App 调用一次。
export function useProgress() {
  // 数组解构：取出当前值 completed 和更新函数 setCompleted。
  // <string[]> 明确元素类型；传入 () => {...} 是惰性初始化，重渲染不重复读存储。
  // StrictMode 在开发时可能额外调用初始化器检查纯度，所以这里不写入外部系统。
  const [completed, setCompleted] = useState<string[]>(() => {
    try {
      // JSON.parse 可能抛错，存储权限也可能被禁用；try/catch 提供空进度作为回退。
      const saved: unknown = JSON.parse(localStorage.getItem(KEY) || '[]')
      // 三元表达式：是数组则过滤，否则返回 []。
      return Array.isArray(saved)
        ? [
            // new Set(...) 去重（类似 Java Set）；[...set] 用展开语法转回数组。
            ...new Set(
              saved.filter(
                // 返回类型谓词 id is string，使过滤后的元素被 TS 识别为 string。
                (id): id is string =>
                  typeof id === 'string' && lessons.some((lesson) => lesson.id === id),
              ),
            ),
          ]
        : []
    } catch {
      return []
    }
  })
  // Effect 在提交 UI 后与浏览器存储同步；不要在组件渲染过程中直接 setItem。
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(completed))
    } catch {
      /* 禁用存储时仍可在当前页面学习。 */
    }
  }, [completed]) // 依赖数组：初次挂载后执行，之后 completed 的引用变化时再执行。
  // (id: string) => ... 是带类型参数的箭头函数，不是泛型。
  const toggle = (id: string) =>
    // 函数式更新：React 把更新队列中的前一个状态传进来，避免依赖旧闭包值。
    setCompleted((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    )
  // 对象属性简写，等价于 { completed: completed, toggle: toggle }。
  // 调用方用 const { completed, toggle } = useProgress() 做对象解构。
  return { completed, toggle }
}
