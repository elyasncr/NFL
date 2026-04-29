import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',   // Necessário para funcionar dentro do Docker
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,  // Necessário para hot reload dentro do Docker (inotify issue)
      interval: 1000,
    },
    hmr: {
      clientPort: 5173,  // Porta que o browser usa para o WebSocket do HMR
    },
    proxy: {
      '/ml':     { target: 'http://backend:8000', changeOrigin: true },
      '/rag':    { target: 'http://backend:8000', changeOrigin: true },
      '/agent':  { target: 'http://backend:8000', changeOrigin: true },
      '/vision': { target: 'http://backend:8000', changeOrigin: true },
      '/health': { target: 'http://backend:8000', changeOrigin: true },
    }
  }
})
