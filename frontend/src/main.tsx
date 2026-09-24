/**
 * 应用入口：index.html 加载此文件，类似先找到 Java 程序的 main 方法。
 * .tsx = TypeScript + JSX；JSX 允许在代码中写看起来像 HTML 的元素声明。
 */
// { StrictMode } 是「具名导入」，名称要与模块导出一致。
import { StrictMode } from 'react'
// react-dom 负责把 React 元素渲染到浏览器 DOM；react 本身提供组件 / Hooks 等能力。
import { createRoot } from 'react-dom/client'
// 不接收变量的 import 是副作用导入：交给 Vite 把全局 CSS 加载到页面。
import './index.css'
// 没有 {} 的 App 是「默认导入」，对应 App.tsx 的 export default。
import App from './App.tsx'

// document 是浏览器全局对象；getElementById 找到 index.html 中的容器。
// 后缀 ! 是非空断言，只影响类型检查，不会在运行时补造元素；这里依赖 HTML 确实有 root。
// createRoot 建立 React 渲染根，render 提交根组件树；通常整个应用只做一次。
createRoot(document.getElementById('root')!).render(
  // StrictMode 的额外开发检查能发现不纯渲染和缺失的 Effect 清理，不是生产环境双执行。
  <StrictMode>
    {/* 大写开头的 <App /> 是自定义组件；自闭合语法表示没有子元素。 */}
    <App />
  </StrictMode>,
)
