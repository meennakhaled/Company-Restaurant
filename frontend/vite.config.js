import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // The API and the SignalR hub are proxied so the browser only ever talks to one
    // origin in development. That keeps cookies, CORS and websockets simple.
    proxy: {
      '/api': { target: 'http://localhost:5088', changeOrigin: true },
      '/hubs': { target: 'http://localhost:5088', changeOrigin: true, ws: true },
    },
  },
})
