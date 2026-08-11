import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => ({
  server: {
    port: 5173,
    strictPort: false,
    host: true,
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          telemetry: ['@sentry/react'],
          icons: ['lucide-react'],
          cvGenerator: ['@react-pdf/renderer'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      devOptions: { enabled: false },
      // Keep FCM messaging SW out of Workbox precache — it is imported into /sw.js.
      includeAssets: ['robots.txt', 'sitemap.xml', 'favicon.ico', 'icons/*.png', 'manifest.json'],
      manifest: false,
      workbox: {
        skipWaiting: false,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/\.netlify\//],
        // Single SW architecture: Workbox PWA + FCM push handlers in /sw.js
        importScripts: ['/web-push-sw.js'],
        globPatterns: [
          'index.html',
          'manifest.json',
          'robots.txt',
          'sitemap.xml',
          'favicon.ico',
          'assets/*.css',
          'icons/*.png',
        ],
        globIgnores: ['**/firebase-messaging-sw.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/icons/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'trabage-icons',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Supabase Storage media. StaleWhileRevalidate so replaced avatar/cover
            // paths (same object key) refresh; cache-bust ?v= still creates unique URLs.
            urlPattern: ({ url }) =>
              url.hostname.endsWith('supabase.co') && url.pathname.includes('/storage/v1/object/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'trabage-supabase-media',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Hashed route chunks: cache on demand instead of precaching every lazy route.
            urlPattern: ({ request, url }) =>
              request.destination === 'script' && url.pathname.startsWith('/assets/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'trabage-js-assets',
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
}));
