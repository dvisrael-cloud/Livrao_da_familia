import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    // Drop only specific console methods to keep console.error and console.warn active
    pure: ['console.log', 'console.info', 'console.debug', 'console.trace'],
    drop: ['debugger']
  },
  build: {
    minify: 'esbuild',
    sourcemap: false
  },
  server: {
    port: 3002,
    strictPort: false,
    host: '0.0.0.0'
  }
})
