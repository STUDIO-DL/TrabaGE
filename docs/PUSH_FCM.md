# Push notifications (Web Push / VAPID)

TrabaGE uses the native **Web Push API with VAPID** as the sole push transport for OS notifications — no Firebase/FCM dependency. Push works for installed PWAs and, where the browser allows it (Chrome/Edge on Android and desktop), for users who have not installed the app. Not supported on iOS Safari browser tabs (only installed iOS PWAs, per platform limitations).

Architecture: **PWA -> `PushManager.subscribe()` -> Supabase `push_subscriptions` -> Edge `send_push` -> `web-push` (VAPID) -> Push service -> Device**

| Layer | Location |
|-------|----------|
| Client subscribe/permission | `src/config/webPush.js` |
| Permission prompt UI | `src/components/common/PushPermissionPrompt.jsx` |
| Subscription persistence | `src/services/pushSubscriptions.service.js` -> RPC `upsert_web_push_subscription` / `deactivate_web_push_subscription` |
| Service worker (`push` + `notificationclick`) | `public/web-push-sw.js` (imported into `/sw.js` via Workbox `importScripts`) |
| Device registry | `push_subscriptions` (`endpoint`, `p256dh`, `auth`) |
| Preferences | `notification_preferences` + `filter_push_recipients` |
| Sender | Edge function `send_push` (`supabase/functions/_shared/webPush.ts`, `npm:web-push`) |
| Admin broadcasts | `admin_push_broadcast_log`, `scheduled_push_notifications` |

## 1. Generate a VAPID key pair

```bash
npx web-push generate-vapid-keys
```

This gives you a public and a private key (URL-safe base64). Keep the private key secret.

## 2. Environment variables

### Netlify (frontend)

```env
VITE_WEB_PUSH_VAPID_PUBLIC_KEY=<public-key>
```

This is the public half of the key pair — safe to expose to the client.

### Supabase Edge Function secrets (`send_push`)

```bash
supabase secrets set VAPID_PUBLIC_KEY=<public-key> VAPID_PRIVATE_KEY=<private-key> VAPID_SUBJECT="mailto:contacto@trabage.org"
```

`VAPID_PUBLIC_KEY` **must exactly match** `VITE_WEB_PUSH_VAPID_PUBLIC_KEY` — a mismatch causes every push to fail. Never put `VAPID_PRIVATE_KEY` in Netlify or any frontend env. Verify parity with `node scripts/verify-vapid-parity.mjs`.

## 3. Database

`push_subscriptions` (`endpoint`, `p256dh`, `auth`, `is_active`, `last_used_at`) was introduced by `supabase/migrations/134_fcm_push_transport.sql` and extended for the VAPID transport by `137_web_push_vapid_transport.sql` / `140_push_test_web_subscriptions.sql`. A legacy `fcm_token` column remains for backward compatibility but is unused by current client code.

## 4. Deploy

```bash
supabase db push
supabase functions deploy send_push
# or: scripts/deploy-send-push-api.ps1
```

Set Netlify `VITE_WEB_PUSH_VAPID_PUBLIC_KEY` and redeploy the frontend.

## 5. Device flow

1. User grants notification permission -> `requestNotificationPermission()` (`src/config/webPush.js`).
2. `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` creates the browser subscription.
3. Subscription (`endpoint`/`p256dh`/`auth`) is upserted via `upsert_web_push_subscription`.
4. Logout / disable -> `deactivate_web_push_subscription`.
5. `send_push` loads active subscriptions and calls `webpush.sendNotification` per subscription.
6. Invalid subscriptions (HTTP 404/410 from the push service) are deactivated automatically.

## 6. Service workers

| Env | Worker |
|-----|--------|
| Production | `/sw.js` (VitePWA Workbox + `importScripts('/web-push-sw.js')`) |
| Development | `/web-push-sw.js` directly (VitePWA disabled in DEV) |

`public/web-push-sw.js` listens for the native `push` event, parses the JSON payload, and shows the OS notification; `notificationclick` focuses/opens the app at the payload's `url`.

## 7. Verification

1. Login on Chrome (desktop or Android PWA).
2. Enable push in settings / accept the soft prompt.
3. Confirm `push_subscriptions` has an active row (`endpoint`/`p256dh`/`auth`) for your user.
4. Run the DEV "Enviar notificación push de prueba" button in notification settings.
5. Expect an **OS-level** notification (not only the in-app bell). Check Supabase Edge Function logs for `send_push_web_delivery` — `subscriptions_sent: 0` with `isVapidConfigured()` false means the VAPID secrets are missing or mismatched.

## 8. Preference filtering

Transport-agnostic RPCs stay the same:

- `filter_push_recipients`
- `user_allows_push_notification`
- `notification_preferences.push_enabled` / category flags

Prefs live only in Supabase (`notification_preferences`).
