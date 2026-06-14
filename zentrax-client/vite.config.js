import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['.ngrok-free.dev']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const normalizedId = id.replace(/\\/g, '/');
            if (normalizedId.includes('/three/') || normalizedId.includes('/@react-three/')) {
              return 'threejs-vendor';
            }
            if (normalizedId.includes('/firebase/')) {
              return 'firebase-vendor';
            }
            if (normalizedId.includes('/react-syntax-highlighter/')) {
              return 'syntax-highlighter-vendor';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})