import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // Escuta na rede local — abrir o CRM no celular/outro PC pelo IP da máquina.
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas que quase nunca mudam em arquivos próprios: a cada deploy
        // o navegador só baixa de novo o código do app, o resto vem do cache.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) {
            return 'vendor-react'
          }
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('@tanstack')) return 'vendor-query'
          return undefined
        },
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
})
