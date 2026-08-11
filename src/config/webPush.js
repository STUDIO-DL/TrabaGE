import { pushSubscriptionsService } from '../services/pushSubscriptions.service';
import { readViteEnv } from './env';
import { reportError } from '../utils/logger';

const DEV_WORKER = '/web-push-sw.js';
const PROD_WORKER = '/sw.js';
let currentEndpoint = null;
const permissionListeners = new Set();

function isLocalhost() { return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname); }
function isIosBrowserTab() {
  if (!/iphone|ipad|ipod/i.test(navigator.userAgent ?? '')) return false;
  return !(window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true);
}
function base64UrlToUint8Array(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}
function notifyPermissionChange() { permissionListeners.forEach((listener) => { try { listener(); } catch { /* no-op */ } }); }

export const isWebPushConfigured = () => Boolean(readViteEnv(import.meta.env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY));
export const isPushSupported = () => typeof window !== 'undefined' && typeof navigator !== 'undefined' && Boolean(
  'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window &&
  (window.isSecureContext || isLocalhost()) && !isIosBrowserTab(),
);
export const getNotificationPermissionStatus = () => typeof window === 'undefined' || !('Notification' in window) ? 'default' : Notification.permission;
export const onPushPermissionChange = (listener) => { permissionListeners.add(listener); return () => permissionListeners.delete(listener); };

async function getRegistration() {
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration ?? navigator.serviceWorker.register(import.meta.env.PROD ? PROD_WORKER : DEV_WORKER, { scope: '/' });
}

export async function registerPushSubscription(userId) {
  if (!userId || !isPushSupported() || getNotificationPermissionStatus() !== 'granted') return null;
  const vapidPublicKey = readViteEnv(import.meta.env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY);
  if (!vapidPublicKey) return null;
  try {
    const registration = await getRegistration();
    await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({
      userVisibleOnly: true, applicationServerKey: base64UrlToUint8Array(vapidPublicKey),
    });
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
    currentEndpoint = json.endpoint;
    const { error } = await pushSubscriptionsService.upsert(json);
    if (error) throw error;
    return subscription;
  } catch (error) { reportError(error, { area: 'web_push_subscription_register' }); return null; }
}

export async function requestNotificationPermission(userId) {
  if (!isPushSupported() || getNotificationPermissionStatus() === 'denied') return false;
  try {
    if (getNotificationPermissionStatus() !== 'granted') {
      if (await Notification.requestPermission() !== 'granted') { notifyPermissionChange(); return false; }
      notifyPermissionChange();
    }
    return Boolean(await registerPushSubscription(userId));
  } catch (error) { reportError(error, { area: 'web_push_permission' }); return false; }
}

export async function setWebPushEnabled(enabled, userId = null) {
  if (enabled) return registerPushSubscription(userId);
  await pushSubscriptionsService.deactivate(currentEndpoint); currentEndpoint = null; return null;
}
export const bindWebPushUser = (userId) => registerPushSubscription(userId);
export const clearWebPushUser = () => setWebPushEnabled(false);
export const initWebPush = async () => null;
