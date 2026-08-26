import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // Relative base so a `npm run build` can be served from any subpath
  // (GitHub Pages, S3, a docs folder) without extra configuration.
  base: './',
})
