import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/budget-app-starter/',   // важно за GitHub Pages
  plugins: [react()],
})
