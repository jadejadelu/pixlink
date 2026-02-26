import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: parseInt(process.env.VITE_DEV_PORT || '5173', 10),
    host: process.env.VITE_DEV_HOST || 'localhost',
    proxy: {
      '/api/ztm-local-agent': {
        target: process.env.VITE_ZTM_LOCAL_AGENT_URL?.replace('/api/ztm-local-agent', '') || 'http://localhost:7778',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ztm-local-agent/, ''),
      },
    }
  }
})
