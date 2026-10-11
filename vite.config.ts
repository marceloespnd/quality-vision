import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react'
          if (id.includes('node_modules/chart.js/') || id.includes('node_modules/react-chartjs-2/')) return 'charts'
          if (id.includes('node_modules/@firebase/') || id.includes('node_modules/firebase/')) return 'firebase'
        },
      },
    },
  },
})
