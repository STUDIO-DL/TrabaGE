/* Standalone development worker. Production imports this file from Workbox's /sw.js. */
/* global clients */
function resolveNotificationUrl(payload) {
  const candidates = [payload.url, payload.link, payload.data?.url, payload.data?.link];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.startsWith('/') && !candidate.startsWith('//')) {
      return candidate;
    }
  }
  return '/';
}

function toAbsoluteUrl(path) {
  try {
    return new URL(path, self.location.origin).href;
  } catch {
    return self.location.origin + '/';
  }
}

async function showPushNotification(title, options) {
  try {
    await self.registration.showNotification(title, options);
  } catch {
    await self.registration.showNotification(title, {
      ...options,
      icon: undefined,
      badge: undefined,
    });
  }
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() ?? '' };
  }
  const url = resolveNotificationUrl(payload);
  const title = payload.title || 'TrabaGE';
  const tag = String(payload.notificationId || payload.type || 'trabage-push');
  const origin = self.location.origin;
  event.waitUntil(
    showPushNotification(title, {
      body: payload.body || '',
      icon: payload.icon || `${origin}/icons/icon-192.png`,
      badge: payload.badge || `${origin}/icons/icon-72.png`,
      tag,
      renotify: true,
      data: { url, notificationId: payload.notificationId || null },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = event.notification.data?.url || '/';
  const absoluteUrl = toAbsoluteUrl(path);
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => {
      try {
        return new URL(client.url).origin === self.location.origin;
      } catch {
        return false;
      }
    });
    if (existing) {
      await existing.focus();
      if (typeof existing.navigate === 'function') {
        try {
          await existing.navigate(absoluteUrl);
          return;
        } catch {
          // Fall through to postMessage / openWindow.
        }
      }
      existing.postMessage({ type: 'PUSH_NAVIGATE', url: path });
      return;
    }
    await clients.openWindow(absoluteUrl);
  })());
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const applicationServerKey = event.oldSubscription?.options?.applicationServerKey;
      const nextSubscription = event.newSubscription
        ?? (applicationServerKey
          ? await self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          })
          : await self.registration.pushManager.getSubscription());
      const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      windows.forEach((client) => {
        client.postMessage({
          type: 'PUSH_SUBSCRIPTION_CHANGE',
          endpoint: nextSubscription?.endpoint ?? null,
        });
      });
    } catch {
      // The next foreground bind will recreate the subscription.
    }
  })());
});
