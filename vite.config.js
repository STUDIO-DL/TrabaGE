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
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          telemetry: ['@sentry/react', 'react-onesignal'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      includeAssets: ['robots.txt', 'sitemap.xml', 'favicon.ico', 'icons/*.png', 'manifest.json'],
      manifest: false,
      workbox: {
        globPatterns: [
          'index.html',
          'manifest.json',
          'robots.txt',
          'sitemap.xml',
          'favicon.ico',
          'assets/**/*.{js,css,png,svg,ico}',
          'icons/*.png',
        ],
        globIgnores: ['**/OneSignalSDKWorker.js', '**/OneSignalSDKUpdaterWorker.js'],
      },
    }),
  ],
});
