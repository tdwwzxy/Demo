import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './style.css'

// React 接管 root 节点。StrictMode 会在开发环境额外检查副作用是否正确清理。
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
