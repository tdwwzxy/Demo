import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite 只负责前端开发；生产构建由 Spring Boot 同源提供，避免跨域与 Cookie 混乱。
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5175,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:8091', '/uploads': 'http://127.0.0.1:8091' },
  },
})
