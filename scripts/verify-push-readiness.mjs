/**
 * Local push readiness preflight.
 *
 * This does not log in, does not call send_push, and does not send a real push.
 * It checks that the client can ask OS permission, obtain an FCM token, register
 * it in Supabase, and that the service worker / edge-function wiring exists.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const checks = [];

function addCheck(name, pass, detail = '') {
  checks.push({ name, pass: Boolean(pass), detail });
}

function readRelative(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function loadEnvFile(relativePath) {
  const envPath = path.join(root, relativePath);
  if (!fs.existsSync(envPath)) return {};

  const env = fs.readFileSync(envPath, 'utf8');
  return Object.fromEntries(
    env
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '').trim()]),
  );
}

const env = loadEnvFile('.env.local');

const requiredEnv = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_VAPID_KEY',
];

for (const key of requiredEnv) {
  addCheck(`env ${key}`, Boolean(env[key]), env[key] ? 'present' : 'missing in .env.local');
}

const files = [
  'src/config/firebase.js',
  'src/config/fcm.js',
  'src/hooks/usePushPermission.js',
  'src/services/pushSubscriptions.service.js',
  'src/services/notificationPreferences.service.js',
  'public/firebase-messaging-sw.js',
  'supabase/functions/send_push/index.ts',
  'vite.config.js',
];

for (const relativePath of files) {
  addCheck(`file ${relativePath}`, fileExists(relativePath), fileExists(relativePath) ? 'present' : 'missing');
}

const fcm = fileExists('src/config/fcm.js') ? readRelative('src/config/fcm.js') : '';
const permissionHook = fileExists('src/hooks/usePushPermission.js')
  ? readRelative('src/hooks/usePushPermission.js')
  : '';
const pushSubs = fileExists('src/services/pushSubscriptions.service.js')
  ? readRelative('src/services/pushSubscriptions.service.js')
  : '';
const sw = fileExists('public/firebase-messaging-sw.js')
  ? readRelative('public/firebase-messaging-sw.js')
  : '';
const vite = fileExists('vite.config.js') ? readRelative('vite.config.js') : '';
const sendPush = fileExists('supabase/functions/send_push/index.ts')
  ? readRelative('supabase/functions/send_push/index.ts')
  : '';

addCheck(
  'client detects push support',
  /Notification/.test(fcm) &&
    /serviceWorker/.test(fcm) &&
    /PushManager/.test(fcm) &&
    /isSecureContext/.test(fcm),
  'Notification + ServiceWorker + PushManager + secure context checks',
);
addCheck(
  'client asks OS permission',
  /Notification\.requestPermission\(\)/.test(fcm),
  'permission prompt is wired',
);
addCheck(
  'client obtains FCM token',
  /getToken\(messaging/.test(fcm) && /VITE_FIREBASE_VAPID_KEY/.test(fcm),
  'getToken uses the web push VAPID key',
);
addCheck(
  'client registers service worker for FCM',
  /navigator\.serviceWorker\.register/.test(fcm) &&
    /firebase-messaging-sw\.js/.test(fcm) &&
    /\/sw\.js/.test(fcm),
  'dev SW and production SW paths are wired',
);
addCheck(
  'client saves FCM token',
  /pushSubscriptionsService\.upsert/.test(fcm),
  'token is persisted after permission is granted',
);
addCheck(
  'settings flow enables push after Allow',
  /requestOsPushPermission/.test(permissionHook) &&
    /setFcmPushEnabled\(true,\s*user\.id\)/.test(permissionHook),
  'after granted permission the app enables and refreshes FCM',
);
addCheck(
  'Supabase subscription RPC is wired',
  /upsert_push_subscription/.test(pushSubs) && /p_fcm_token/.test(pushSubs),
  'FCM token is sent to upsert_push_subscription',
);
addCheck(
  'background service worker displays push',
  /onBackgroundMessage/.test(sw) && /showNotification/.test(sw),
  'background FCM payload creates an OS notification',
);
addCheck(
  'notification click opens the app',
  /notificationclick/.test(sw) && /openWindow/.test(sw),
  'click handler focuses or opens TrabaGE',
);
addCheck(
  'production PWA imports FCM worker',
  /importScripts:\s*\[['"]\/firebase-messaging-sw\.js['"]\]/.test(vite) &&
    /globIgnores:\s*\[['"]\*\*\/firebase-messaging-sw\.js['"]\]/.test(vite),
  'Workbox imports the FCM worker and keeps it out of precache',
);
addCheck(
  'send_push can read active subscriptions',
  /get_push_subscriptions_for_users/.test(sendPush) && /No hay tokens FCM activos/.test(sendPush),
  'edge function has the subscription lookup path',
);
addCheck(
  'send_push filters user preferences',
  /filter_push_recipients/.test(sendPush),
  'push_enabled and category preferences are checked server-side',
);

const failed = checks.filter((check) => !check.pass);

console.log('Push readiness preflight (no real push sent)');
console.log('');

for (const check of checks) {
  const mark = check.pass ? 'OK ' : 'ERR';
  console.log(`${mark} ${check.name}${check.detail ? ` - ${check.detail}` : ''}`);
}

console.log('');

if (failed.length > 0) {
  console.log(`Result: blocked (${failed.length} issue${failed.length === 1 ? '' : 's'}).`);
  process.exit(1);
}

console.log('Result: ready.');
console.log('If the user taps Allow on a supported device/browser, TrabaGE can request permission, get an FCM token, store it, and receive/display pushes.');
