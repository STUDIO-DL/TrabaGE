/**
 * Native Web Push readiness preflight (VAPID + Service Worker).
 * Does not send a real push or call edge functions.
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
  'VITE_WEB_PUSH_VAPID_PUBLIC_KEY',
];

for (const key of requiredEnv) {
  addCheck(`env ${key}`, Boolean(env[key]), env[key] ? 'present' : 'missing in .env.local');
}

const files = [
  'src/config/webPush.js',
  'src/hooks/usePushPermission.js',
  'src/services/pushSubscriptions.service.js',
  'src/services/notificationPreferences.service.js',
  'public/web-push-sw.js',
  'supabase/functions/send_push/index.ts',
  'supabase/functions/send_web_push/index.ts',
  'supabase/functions/_shared/webPush.ts',
  'vite.config.js',
];

for (const relativePath of files) {
  addCheck(`file ${relativePath}`, fileExists(relativePath), fileExists(relativePath) ? 'present' : 'missing');
}

const webPush = fileExists('src/config/webPush.js') ? readRelative('src/config/webPush.js') : '';
const permissionHook = fileExists('src/hooks/usePushPermission.js')
  ? readRelative('src/hooks/usePushPermission.js')
  : '';
const pushSubs = fileExists('src/services/pushSubscriptions.service.js')
  ? readRelative('src/services/pushSubscriptions.service.js')
  : '';
const sw = fileExists('public/web-push-sw.js') ? readRelative('public/web-push-sw.js') : '';
const vite = fileExists('vite.config.js') ? readRelative('vite.config.js') : '';
const sendPush = fileExists('supabase/functions/send_push/index.ts')
  ? readRelative('supabase/functions/send_push/index.ts')
  : '';
const sendWebPush = fileExists('supabase/functions/send_web_push/index.ts')
  ? readRelative('supabase/functions/send_web_push/index.ts')
  : '';
const sharedWebPush = fileExists('supabase/functions/_shared/webPush.ts')
  ? readRelative('supabase/functions/_shared/webPush.ts')
  : '';

addCheck(
  'client detects push support',
  /Notification/.test(webPush) &&
    /serviceWorker/.test(webPush) &&
    /PushManager/.test(webPush) &&
    /isSecureContext/.test(webPush),
  'Notification + ServiceWorker + PushManager + secure context checks',
);
addCheck(
  'client asks OS permission',
  /Notification\.requestPermission\(\)/.test(webPush),
  'permission prompt is wired',
);
addCheck(
  'client subscribes with VAPID public key',
  /pushManager\.subscribe/.test(webPush) && /VITE_WEB_PUSH_VAPID_PUBLIC_KEY/.test(webPush),
  'PushManager.subscribe uses the native Web Push VAPID key',
);
addCheck(
  'client registers service worker',
  /navigator\.serviceWorker\.register/.test(webPush) &&
    /web-push-sw\.js/.test(webPush) &&
    /\/sw\.js/.test(webPush),
  'dev SW and production SW paths are wired',
);
addCheck(
  'client saves Web Push subscription',
  /pushSubscriptionsService\.upsert/.test(webPush),
  'subscription is persisted after permission is granted',
);
addCheck(
  'settings flow enables push after Allow',
  /requestNotificationPermission/.test(permissionHook) &&
    /setWebPushEnabled\(true/.test(permissionHook),
  'after granted permission the app enables and refreshes Web Push',
);
addCheck(
  'Supabase web subscription RPC is wired',
  /upsert_web_push_subscription/.test(pushSubs) &&
    /p_endpoint/.test(pushSubs) &&
    /p_p256dh/.test(pushSubs) &&
    /p_auth/.test(pushSubs),
  'Web Push subscription is sent to upsert_web_push_subscription',
);
addCheck(
  'background service worker displays push',
  /addEventListener\(['"]push['"]/.test(sw) && /showNotification/.test(sw),
  'push event creates an OS notification',
);
addCheck(
  'service worker resolves url and link',
  /payload\.url/.test(sw) && /payload\.link/.test(sw),
  'click target accepts url or legacy link field',
);
addCheck(
  'notification click opens the app',
  /notificationclick/.test(sw) && /openWindow/.test(sw),
  'click handler focuses or opens TrabaGE',
);
addCheck(
  'production PWA imports web push worker',
  /importScripts:\s*\[['"]\/web-push-sw\.js['"]\]/.test(vite),
  'Workbox imports the native web push worker',
);
addCheck(
  'send_push supports web push transport',
  /loadWebPushSubscriptionsForUsers/.test(sendPush) &&
    /isVapidConfigured/.test(sendPush) &&
    /filter_push_recipients/.test(sendPush),
  'edge function can deliver via VAPID and respects preferences',
);
addCheck(
  'send_web_push uses shared module',
  /webPush\.ts/.test(sendWebPush) && /filter_push_recipients/.test(sendWebPush),
  'standalone web push function shares delivery logic and preferences',
);
addCheck(
  'shared web push payload includes url',
  /url:/.test(sharedWebPush) && /resolveInAppPushUrl/.test(sharedWebPush),
  'backend payload matches service worker contract',
);

const failed = checks.filter((check) => !check.pass);

console.log('Web Push readiness preflight (no real push sent)');
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
console.log(
  'If the user taps Allow on a supported browser, TrabaGE can register a Web Push subscription and display OS notifications.',
);
