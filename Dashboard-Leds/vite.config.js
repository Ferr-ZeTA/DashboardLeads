import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '')
  const apiKey = env.RED_API_KEY
  if (!apiKey) console.warn('RED_API_KEY no está configurada; las peticiones al API probablemente responderán 401.')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/metrics/reuniones': {
          target: 'https://prospektia.red.com.sv',
          changeOrigin: true,
          secure: true,
          headers: apiKey ? { 'X-API-Key': apiKey } : {},
        },
      },
    },
  }
})
