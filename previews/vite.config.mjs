import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Preview-only server. The normal app and production configuration are unchanged.
export default defineConfig({
  build: {
    rollupOptions: { input: fileURLToPath(new URL('./mobile-screen.html', import.meta.url)) },
  },
  plugins: [react(), {
    name: 'preview-offline-data',
    resolveId(source) {
      if (source.endsWith('/lib/supabase')) return fileURLToPath(new URL('./offline-client.js', import.meta.url))
    },
  }],
})
