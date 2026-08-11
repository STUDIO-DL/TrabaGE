/* Standalone development worker. Production imports this file from Workbox's /sw.js. */
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data?.json() ?? {}; } catch { payload = { body: event.data?.text() ?? '' }; }
  const url = typeof payload.url === 'string' && payload.url.startsWith('/') ? payload.url : '/';
  event.waitUntil(self.registration.showNotification(payload.title || 'TrabaGE', {
    body: payload.body || '', icon: payload.icon || '/icons/icon-192.png', badge: payload.badge || '/icons/icon-72.png',
    data: { url, notificationId: payload.notificationId || null },
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); const url = event.notification.data?.url || '/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    return existing ? existing.focus().then(() => existing.navigate(url)) : clients.openWindow(url);
  }));
});
