/**
 * 第 6 站：开发工具配置，运行在 Node.js 环境，不是发给浏览器执行的业务代码。
 * 改此文件或 .env 后需要重启 dev 服务；server.proxy 只负责开发时转发。
 */
// 默认导入 React 插件；插件负责 JSX / React 开发体验集成。
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // defineConfig 提供类型提示；传函数时可根据 mode（development / production 等）返回配置。
  // { mode } 是参数解构。process.cwd() 是 Node 当前工作目录。
  // loadEnv 第三个参数 '' 表示在服务端读取所有前缀，不意味着把所有变量暴露给浏览器。
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // plugins 是插件数组，react() 执行工厂函数，得到插件配置。
    plugins: [react()],
    server: {
      host: '127.0.0.1', // 只监听本机回环地址；手机不能直接通过自己的 localhost 访问。
      port: 5173,
      strictPort: true, // 端口占用就报错，避免自动换端口后找错页面 / localStorage。
      proxy: {
        // /api/users 转发到目标的 /api/users；未配置 rewrite，所以保留 /api 前缀。
        // changeOrigin 调整代理请求的 Host；它不是生产环境的跨域或认证配置。
        '/api': { target: env.API_PROXY_TARGET || 'http://localhost:8080', changeOrigin: true },
      },
    },
    // preview 只预览 dist 构建产物，不是正式部署服务，也不自动继承上面的开发代理。
    preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  }
})
