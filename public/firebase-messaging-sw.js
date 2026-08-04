/* Firebase Cloud Messaging Web Push service worker.
 * Production: imported into Workbox /sw.js via vite-plugin-pwa importScripts.
 * Development: registered directly as /firebase-messaging-sw.js.
 *
 * Firebase Messaging token creation stays in the Vite app bundle. This worker is
 * intentionally config-free so no Firebase API key is written to static assets.
 */

const DEFAULT_NOTIFICATION_TITLE = 'TrabaGE';
const DEFAULT_NOTIFICATION_ICON = '/icons/icon-192.png';

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readPushPayload(event) {
  if (!event.data) return {};

  try {
    return event.data.json();
  } catch {
    const text = event.data.text();
    return safeJsonParse(text) ?? { data: { body: text } };
  }
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizePayload(rawPayload) {
  const payload = asRecord(rawPayload);
  const data = { ...asRecord(payload.data) };
  const notification = {
    ...asRecord(payload.notification),
    ...asRecord(payload.webpush?.notification),
  };

  const link =
    data.link ||
    data.url ||
    payload.fcmOptions?.link ||
    payload.fcm_options?.link ||
    payload.webpush?.fcm_options?.link ||
    notification.click_action ||
    notification.link ||
    '/';

  return {
    title:
      data.title ||
      notification.title ||
      payload.title ||
      DEFAULT_NOTIFICATION_TITLE,
    body: data.body || notification.body || payload.body || '',
    data: {
      ...data,
      link,
    },
    options: {
      icon: DEFAULT_NOTIFICATION_ICON,
      badge: DEFAULT_NOTIFICATION_ICON,
      tag: data.tag || data.notification_id || data.message_id || undefined,
      renotify: false,
    },
  };
}

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

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const notification = normalizePayload(readPushPayload(event));

      await self.registration.showNotification(notification.title, {
        body: notification.body,
        data: notification.data,
        ...notification.options,
      });
    })(),
  );
});

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
