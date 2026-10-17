import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development Vite serves the client and forwards /api to the Express server, on the same
// PORT the server reads (server/config.ts).
const serverPort = process.env.PORT || '3000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': `http://localhost:${serverPort}`,
    },
  },
})
