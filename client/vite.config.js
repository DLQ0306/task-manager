import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 开发服务器配置：把 /api 请求转发到后端 Express（端口 3000）
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});
