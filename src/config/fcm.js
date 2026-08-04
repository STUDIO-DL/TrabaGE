import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from 'firebase/messaging';
import { pushSubscriptionsService } from '../services/pushSubscriptions.service';
import { getFirebaseApp, getFirebaseWebConfig, isFirebaseConfigured } from './firebase';
import { readViteEnv } from './env';
import { reportError } from '../utils/logger';
import { resolvePushNavigationTarget } from '../utils/pushNavigation';

const DEV_MESSAGING_SW = '/firebase-messaging-sw.js';
const PROD_MESSAGING_SW = '/sw.js';

let initPromise = null;
let initialized = false;
let messaging = null;
let currentToken = null;
let boundUserId = null;
let foregroundListenerAttached = false;

const permissionChangeListeners = new Set();

function notifyPermissionChangeListeners() {
  permissionChangeListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors during permission sync.
    }
  });
}

export function onPushPermissionChange(listener) {
  permissionChangeListeners.add(listener);
  return () => permissionChangeListeners.delete(listener);
}

export const isFcmConfigured = () =>
  Boolean(isFirebaseConfigured() && readViteEnv(import.meta.env.VITE_FIREBASE_VAPID_KEY));

function isLocalhost() {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
}

function isIosBrowserTab() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent ?? '';
  const isIos = /iphone|ipad|ipod/i.test(ua);
  if (!isIos) return false;

  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  return !standalone;
}

export const isPushSupported = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!('PushManager' in window)) return false;
  if (!window.isSecureContext && !isLocalhost()) return false;

  // iOS/iPadOS Web Push is available to installed Home Screen web apps.
  if (isIosBrowserTab()) return false;

  return true;
};

function getVapidKey() {
  return readViteEnv(import.meta.env.VITE_FIREBASE_VAPID_KEY);
}

async function ensureMessagingServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers no soportados');
  }

  if (import.meta.env.PROD) {
    // Prefer the merged Workbox SW (/sw.js) once VitePWA has registered it.
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;

    return navigator.serviceWorker.register(PROD_MESSAGING_SW, { scope: '/' });
  }

  // VitePWA is disabled in DEV — use the standalone FCM worker.
  const existing = await navigator.serviceWorker.getRegistration(DEV_MESSAGING_SW);
  if (existing) return existing;

  return navigator.serviceWorker.register(DEV_MESSAGING_SW, { scope: '/' });
}

function attachForegroundListener() {
  if (!messaging || foregroundListenerAttached) return;
  foregroundListenerAttached = true;

  try {
    onMessage(messaging, (payload) => {
      notifyPermissionChangeListeners();

      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const title = payload?.data?.title || payload?.notification?.title || 'TrabaGE';
      const body = payload?.data?.body || payload?.notification?.body || '';
      const data = payload?.data ?? {};

      const notification = new Notification(title, {
        body,
        data,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
      });

      notification.onclick = () => {
        const target = resolvePushNavigationTarget({
          type: data.type ?? null,
          metadata: data,
          launchUrl: data.link ?? data.url ?? null,
        }, window.location.origin);

        if (target) {
          window.focus();
          window.location.assign(target);
        }
        notification.close();
      };
    });
  } catch (error) {
    reportError(error, { area: 'fcm_foreground_listener' });
  }
}

export const initFcm = async () => {
  if (!isFcmConfigured() || !isPushSupported()) return null;
  if (initialized && messaging) return messaging;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const supported = await isSupported();
      if (!supported) {
        return null;
      }

      const app = getFirebaseApp();
      if (!app) return null;

      messaging = getMessaging(app);
      initialized = true;
      attachForegroundListener();
      return messaging;
    } catch (error) {
      reportError(error, { area: 'fcm_init' });
      return null;
    }
  })();

  return initPromise;
};

async function persistFcmToken(token) {
  if (!token) return;
  currentToken = token;
  await pushSubscriptionsService.upsert(String(token));
}

async function refreshAndPersistToken() {
  await initFcm();
  if (!messaging) return null;

  const vapidKey = getVapidKey();
  if (!vapidKey) return null;

  try {
    const registration = await ensureMessagingServiceWorker();
    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      await persistFcmToken(token);
    }

    return token || null;
  } catch (error) {
    reportError(error, { area: 'fcm_get_token' });
    return null;
  }
}

export const getNotificationPermissionStatus = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
};

export const requestNotificationPermission = async () => {
  const initializedMessaging = await initFcm();
  if (!initializedMessaging) return false;

  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    if (Notification.permission !== 'granted') {
      const result = await Notification.requestPermission();
      notifyPermissionChangeListeners();
      if (result !== 'granted') return false;
    }

    const token = await refreshAndPersistToken();
    return Boolean(token);
  } catch (error) {
    reportError(error, { area: 'fcm_permission' });
    return false;
  }
};

export const setFcmPushEnabled = async (enabled, userId = null) => {
  await initFcm();

  try {
    if (enabled) {
      if (userId) boundUserId = userId;
      if (getNotificationPermissionStatus() !== 'granted') return;
      await refreshAndPersistToken();
      return;
    }

    if (messaging && currentToken) {
      try {
        await deleteToken(messaging);
      } catch (error) {
        reportError(error, { area: 'fcm_delete_token' });
      }
    }

    await pushSubscriptionsService.deactivate(currentToken);
    currentToken = null;
  } catch (error) {
    reportError(error, { area: 'fcm_push_subscription_toggle', enabled });
  }
};

export const bindFcmUser = async (userId, _profileTags = {}) => {
  await initFcm();
  if (!userId) return;
  if (getNotificationPermissionStatus() !== 'granted') return;

  boundUserId = userId;
  await refreshAndPersistToken();
};

export const clearFcmUser = async () => {
  await initFcm();

  try {
    if (messaging && currentToken) {
      try {
        await deleteToken(messaging);
      } catch (error) {
        reportError(error, { area: 'fcm_clear_delete_token' });
      }
    }

    await pushSubscriptionsService.deactivate(currentToken);
  } catch (error) {
    reportError(error, { area: 'fcm_logout' });
  } finally {
    currentToken = null;
    boundUserId = null;
  }
};

export const getCurrentFcmToken = () => currentToken;

export const getBoundFcmUserId = () => boundUserId;

/** @deprecated No-op kept for call-site compatibility during migration. */
export const attachNotificationClickHandler = () => {
  // Foreground clicks: onMessage handler. Background: SW notificationclick.
};

/** Expose public config for the messaging service worker bootstrap if needed. */
export function getPublicFirebaseConfigForSw() {
  return getFirebaseWebConfig();
}
