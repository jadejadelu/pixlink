import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: parseInt(process.env.VITE_DEV_PORT || '5173', 10),
    host: process.env.VITE_DEV_HOST || 'localhost'
  }
})
