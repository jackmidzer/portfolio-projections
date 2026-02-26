import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/portfolio-projections/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'chartjs': ['chart.js', 'react-chartjs-2', 'chartjs-plugin-annotation'],
          'react-vendor': ['react', 'react-dom'],
        }
      }
    }
  }
})
