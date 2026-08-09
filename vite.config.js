import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Stamped into the bundle so Settings can show which build is running. The
  // update banner tells people a new version exists; this tells them which one
  // they're on, which is the other half of that conversation.
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'myrecipes',
        short_name: 'myrecipes',
        description: 'Your personal recipe book',
        theme_color: '#c1432f',
        background_color: '#fdf8f0',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // skipWaiting is deliberately OFF. With it on, a new service worker took
        // over an already-open tab and purged the old precache, so the lazily
        // loaded views in App.jsx 404'd with "Failed to fetch dynamically
        // imported module" — a blank screen, while the update banner was still
        // politely asking the user to click Update. The new worker now waits
        // until the user reloads via that banner.
        skipWaiting: false,
        clientsClaim: false,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
})
