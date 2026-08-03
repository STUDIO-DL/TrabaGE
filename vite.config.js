import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
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
          telemetry: ['@sentry/react', 'react-onesignal'],
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
      // Keep OneSignal workers out of Workbox precache — they must be controlled by OneSignal, not sw.js.
      includeAssets: ['robots.txt', 'sitemap.xml', 'favicon.ico', 'icons/*.png', 'manifest.json'],
      manifest: false,
      workbox: {
        skipWaiting: false,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/\.netlify\//],
        // Single SW architecture: Workbox PWA + OneSignal push handlers in /sw.js
        importScripts: ['https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js'],
        globPatterns: [
          'index.html',
          'manifest.json',
          'robots.txt',
          'sitemap.xml',
          'favicon.ico',
          'assets/*.css',
          'icons/*.png',
        ],
        globIgnores: ['**/OneSignalSDKWorker.js', '**/OneSignalSDKUpdaterWorker.js'],
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
            // Supabase Storage images/avatars/post media — avoid re-downloading on slow links.
            urlPattern: ({ url }) =>
              url.hostname.endsWith('supabase.co') && url.pathname.includes('/storage/v1/object/'),
            handler: 'CacheFirst',
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
});
