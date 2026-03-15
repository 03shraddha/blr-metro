import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Change this to match your GitHub repository name exactly
  base: '/blr-metro/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('deck.gl') || id.includes('@deck.gl')) return 'deckgl'
          if (id.includes('maplibre-gl')) return 'maplibre'
        },
      },
    },
  },
})
