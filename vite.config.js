import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Handle SPA routing for dev server
    // Callback will redirect to / with query params
  },
  build: {
    // Copy public files to dist
    copyPublicDir: true,
  },
})
