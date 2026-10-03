import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Locally the FastAPI backend runs on :8000 (npm run dev:api); on Vercel both share one domain.
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
})
