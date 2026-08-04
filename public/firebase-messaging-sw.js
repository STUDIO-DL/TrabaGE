/* Firebase Cloud Messaging service worker (compat).
 * Production: imported into Workbox /sw.js via vite-plugin-pwa importScripts.
 * Development: registered directly as /firebase-messaging-sw.js.
 */
/* eslint-disable no-undef */

function resolveLink(data) {
  if (!data || typeof data !== 'object') return '/';
  const raw = data.link || data.url || '/';
  if (typeof raw !== 'string' || !raw.trim()) return '/';
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.origin === self.location.origin) {
        return `${url.pathname}${url.search}${url.hash}` || '/';
      }
    } catch {
      return '/';
    }
    return '/';
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath = resolveLink(event.notification?.data);
  const absoluteUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            await client.navigate(absoluteUrl);
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(absoluteUrl);
      }
    })(),
  );
});

importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAOFA8VT5qQ7CgLZcQBq4yR1dWPT-Gh2Ms',
  authDomain: 'trabage-b2ea9.firebaseapp.com',
  projectId: 'trabage-b2ea9',
  storageBucket: 'trabage-b2ea9.firebasestorage.app',
  messagingSenderId: '916583708507',
  appId: '1:916583708507:web:e8aa79fdc486b1d5274c7e',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // Data-only FCM messages: always display from SW (title/body live in data).
  const title = payload?.data?.title || payload?.notification?.title || 'TrabaGE';
  const body = payload?.data?.body || payload?.notification?.body || '';
  const data = payload?.data || {};

  return self.registration.showNotification(title, {
    body,
    data,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  });
});
