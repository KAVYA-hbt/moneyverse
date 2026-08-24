import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Third arg '' loads all vars from .env (not just VITE_-prefixed ones) -- these are only
  // used here for dev-server/proxy config, never exposed to client code.
  const env = loadEnv(mode, process.cwd(), '')
  const frontendPort = Number(env.FRONTEND_PORT) || 5173
  const backendPort = Number(env.BACKEND_PORT) || 8000
  const backendOrigin = `http://localhost:${backendPort}`

  return {
    plugins: [react()],
    server: {
      port: frontendPort,
      // Bind to all interfaces (like the game frontend's `--host 0.0.0.0`), not just
      // localhost -- otherwise this is unreachable from a LAN IP even once running.
      host: true,
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
        },
        '/ws': {
          target: backendOrigin.replace('http', 'ws'),
          ws: true,
        },
      },
    },
  }
})
