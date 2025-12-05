import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1', // Bind to 127.0.0.1 to match Spotify redirect URI
  },
  build: {
    // Copy public files to dist
    copyPublicDir: true,
  },
})
