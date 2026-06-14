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
            if (
              normalizedId.includes('node_modules/three') ||
              normalizedId.includes('node_modules/@react-three') ||
              normalizedId.includes('.pnpm/three') ||
              normalizedId.includes('.pnpm/@react-three')
            ) {
              return 'threejs-vendor';
            }
            if (
              normalizedId.includes('node_modules/firebase') ||
              normalizedId.includes('node_modules/@firebase') ||
              normalizedId.includes('.pnpm/firebase') ||
              normalizedId.includes('.pnpm/@firebase')
            ) {
              return 'firebase-vendor';
            }
            if (normalizedId.includes('react-syntax-highlighter')) {
              return 'syntax-highlighter-vendor';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})