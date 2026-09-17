import { pushSubscriptionsService } from '../services/pushSubscriptions.service';
import { readViteEnv } from './env';
import { reportError } from '../utils/logger';
import {
  applicationServerKeysEqual,
  base64UrlToUint8Array,
} from '../utils/webPushKeys';

const DEV_WORKER = '/web-push-sw.js';
const PROD_WORKER = '/sw.js';
const PUSH_NAVIGATE_MESSAGE = 'PUSH_NAVIGATE';
const PUSH_SUBSCRIPTION_CHANGE_MESSAGE = 'PUSH_SUBSCRIPTION_CHANGE';

let currentEndpoint = null;
let initPromise = null;
let clientListenersBound = false;
const permissionListeners = new Set();
const subscriptionChangeListeners = new Set();

function isLocalhost() {
  return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
}

function isIosBrowserTab() {
  if (!/iphone|ipad|ipod/i.test(navigator.userAgent ?? '')) return false;
  return !(window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true);
}

function notifyPermissionChange() {
  permissionListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // no-op
    }
  });
}

function notifySubscriptionChange() {
  subscriptionChangeListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // no-op
    }
  });
}

function workerUrl() {
  return import.meta.env.PROD ? PROD_WORKER : DEV_WORKER;
}

function isSafeAppPath(url) {
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//');
}

function bindClientListeners() {
  if (clientListenersBound || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  clientListenersBound = true;
  navigator.serviceWorker.addEventListener('message', (event) => {
    const payload = event.data ?? {};
    if (payload.type === PUSH_NAVIGATE_MESSAGE && isSafeAppPath(payload.url)) {
      window.location.assign(payload.url);
      return;
    }
    if (payload.type === PUSH_SUBSCRIPTION_CHANGE_MESSAGE) {
      notifySubscriptionChange();
    }
  });
}

async function waitForActiveWorker(registration) {
  if (registration?.active) return navigator.serviceWorker.ready;
  const pending = registration?.installing ?? registration?.waiting;
  if (!pending) return navigator.serviceWorker.ready;
  await new Promise((resolve) => {
    const onChange = () => {
      if (pending.state === 'activated' || pending.state === 'redundant') {
        pending.removeEventListener('statechange', onChange);
        resolve();
      }
    };
    pending.addEventListener('statechange', onChange);
    onChange();
  });
  return navigator.serviceWorker.ready;
}

async function getRegistration() {
  const existing = await navigator.serviceWorker.getRegistration('/');
  const registration = existing ?? await navigator.serviceWorker.register(workerUrl(), { scope: '/' });
  return waitForActiveWorker(registration);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(task, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) break;
      await sleep(400 * (2 ** attempt));
    }
  }
  throw lastError;
}

async function subscribeWithCurrentKey(registration, vapidPublicKey) {
  const applicationServerKey = base64UrlToUint8Array(vapidPublicKey);
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    const existingKey = existing.options?.applicationServerKey;
    if (existingKey && applicationServerKeysEqual(existingKey, applicationServerKey)) {
      return existing;
    }
    await existing.unsubscribe();
  }
  return withRetry(() => registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  }));
}

export const isWebPushConfigured = () => Boolean(readViteEnv(import.meta.env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY));
export const isPushSupported = () => typeof window !== 'undefined' && typeof navigator !== 'undefined' && Boolean(
  'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window &&
  (window.isSecureContext || isLocalhost()) && !isIosBrowserTab(),
);
export const getNotificationPermissionStatus = () => (
  typeof window === 'undefined' || !('Notification' in window) ? 'default' : Notification.permission
);
export const onPushPermissionChange = (listener) => {
  permissionListeners.add(listener);
  return () => permissionListeners.delete(listener);
};
export const onPushSubscriptionChange = (listener) => {
  subscriptionChangeListeners.add(listener);
  return () => subscriptionChangeListeners.delete(listener);
};

export async function registerPushSubscription(userId) {
  if (!userId || !isPushSupported() || getNotificationPermissionStatus() !== 'granted') return null;
  const vapidPublicKey = readViteEnv(import.meta.env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY);
  if (!vapidPublicKey) return null;
  try {
    await initWebPush();
    const registration = await getRegistration();
    const subscription = await subscribeWithCurrentKey(registration, vapidPublicKey);
    const json = subscription?.toJSON?.() ?? {};
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
    currentEndpoint = json.endpoint;
    await withRetry(async () => {
      const { error } = await pushSubscriptionsService.upsert(json);
      if (error) throw error;
    });
    return subscription;
  } catch (error) {
    reportError(error, { area: 'web_push_subscription_register' });
    return null;
  }
}

export async function requestNotificationPermission(userId) {
  if (!isPushSupported() || getNotificationPermissionStatus() === 'denied') return false;
  try {
    if (getNotificationPermissionStatus() !== 'granted') {
      if (await Notification.requestPermission() !== 'granted') {
        notifyPermissionChange();
        return false;
      }
      notifyPermissionChange();
    }
    return Boolean(await registerPushSubscription(userId));
  } catch (error) {
    reportError(error, { area: 'web_push_permission' });
    return false;
  }
}

export async function setWebPushEnabled(enabled, userId = null) {
  if (enabled) return registerPushSubscription(userId);
  await pushSubscriptionsService.deactivate(currentEndpoint);
  currentEndpoint = null;
  return null;
}

export const bindWebPushUser = (userId) => registerPushSubscription(userId);
export const clearWebPushUser = () => setWebPushEnabled(false);

export async function initWebPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (initPromise) return initPromise;
  bindClientListeners();
  initPromise = (async () => {
    try {
      if (!isPushSupported() && !import.meta.env.PROD) {
        return null;
      }
      await withRetry(() => getRegistration());
      return true;
    } catch (error) {
      reportError(error, { area: 'web_push_init' });
      initPromise = null;
      return null;
    }
  })();
  return initPromise;
}
