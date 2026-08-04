import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/* global process */

function buildFirebaseRuntimeConfig(env) {
  return {
    apiKey: env.VITE_FIREBASE_API_KEY?.trim() ?? '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ?? '',
    projectId: env.VITE_FIREBASE_PROJECT_ID?.trim() ?? '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ?? '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? '',
    appId: env.VITE_FIREBASE_APP_ID?.trim() ?? '',
  };
}

function firebaseRuntimeConfigPlugin(mode) {
  const env = loadEnv(mode, process.cwd(), 'VITE_FIREBASE_');

  return {
    name: 'trabage-firebase-runtime-config',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/firebase-config.json', (request, response, next) => {
        if (!['GET', 'HEAD'].includes(request.method ?? 'GET')) {
          next();
          return;
        }

        const body = JSON.stringify(buildFirebaseRuntimeConfig(env));
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(request.method === 'HEAD' ? undefined : body);
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
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
          telemetry: ['@sentry/react', 'firebase/app', 'firebase/messaging'],
          icons: ['lucide-react'],
          cvGenerator: ['@react-pdf/renderer'],
        },
      },
    },
  },
  plugins: [
    firebaseRuntimeConfigPlugin(mode),
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
        importScripts: ['/firebase-messaging-sw.js'],
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
