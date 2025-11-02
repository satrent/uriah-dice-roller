import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for deployment (useful for GitHub Pages)
  // For GitHub Pages: base: '/uriah-dice-roller/'
  // For root domain or other hosting: base: '/'
  // Can be overridden with environment variable
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 5173,
    open: false, // Set to true if you want the browser to open automatically
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Set to true for production debugging if needed
  },
})
