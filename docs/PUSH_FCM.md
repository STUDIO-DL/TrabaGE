# Push notifications (Firebase Cloud Messaging)

TrabaGE uses **Firebase Cloud Messaging (FCM)** as the sole push transport for native OS notifications. Push works for installed PWAs and, where the browser allows it (notably Chrome on Android / desktop), for users who have not installed the app.

Architecture: **PWA → Firebase Messaging SDK → Supabase `push_subscriptions` → Edge `send_push` → FCM HTTP v1 → Device**

| Layer | Location |
|-------|----------|
| Client SDK | `src/config/firebase.js`, `src/config/fcm.js`, `firebase` |
| Device registry | `push_subscriptions.fcm_token` + RPCs |
| Preferences | `notification_preferences` + `filter_push_recipients` |
| Sender | Edge function `send_push` (FCM HTTP v1) |
| Admin broadcasts | `admin_push_broadcast_log`, `scheduled_push_notifications` |

## 1. Firebase Console setup

1. Go to [Firebase Console](https://console.firebase.google.com) → project **trabage-b2ea9** (or your project)
2. Add a **Web** app and copy `firebaseConfig` into Netlify / `.env.local` as `VITE_FIREBASE_*`
3. **Project settings → Cloud Messaging → Web Push certificates → Generate key pair** → `VITE_FIREBASE_VAPID_KEY`
4. **Project settings → Service accounts → Generate new private key** → store as Supabase secrets only:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
5. Confirm service worker URL in production: `https://trabage.org/sw.js` (Workbox + `/firebase-messaging-sw.js` via `importScripts`). Dev uses `/firebase-messaging-sw.js` directly.

## 2. Environment variables

### Netlify (frontend)

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=1:...:web:...
VITE_FIREBASE_VAPID_KEY=...
VITE_APP_URL=https://trabage.org
```

### Supabase Edge Function secrets (`send_push`)

```bash
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
APP_URL=https://trabage.org
```

Never put the service account private key in Netlify or frontend env.

## 3. Database

Apply migration **134_fcm_push_transport.sql** then **135_remove_onesignal_leftovers.sql** (`supabase db push`):

- Adds `push_subscriptions.fcm_token` (unique when present) and FCM RPCs
- Drops legacy OneSignal columns / `set_onesignal_player_id`
- Requires `fcm_token` on all push subscription rows
- Adds `push_send_log.fcm_message_id`

## 4. Deploy

```bash
supabase db push
supabase functions deploy send_push
# or: scripts/deploy-send-push-api.ps1
```

Set Netlify `VITE_FIREBASE_*` and redeploy the frontend.

## 5. Device flow

1. User logs in → `initFcm()` at boot (`main.jsx`)
2. After permission grant → `getToken({ vapidKey, serviceWorkerRegistration })`
3. Token upserted via `upsert_push_subscription(p_fcm_token)`
4. Logout / disable → `deleteToken` + `deactivate_push_subscription`
5. Sends load active tokens with `get_push_subscriptions_for_users` and call FCM HTTP v1 **per token**
6. Invalid tokens (`UNREGISTERED`, etc.) are deactivated

## 6. Service workers

| Env | Worker |
|-----|--------|
| Production | `/sw.js` (VitePWA Workbox + `importScripts('/firebase-messaging-sw.js')`) |
| Development | `/firebase-messaging-sw.js` (VitePWA disabled in DEV) |

## 7. Verification

1. Login on Chrome (desktop or Android PWA)
2. Enable push in settings / accept the soft prompt
3. Confirm `push_subscriptions` has `fcm_token` for your user
4. Run `npm run test-fcm-push` or use the DEV test button in notification settings
5. Expect an **OS-level** notification (not only in-app bell)

## 8. Preference filtering

Transport-agnostic RPCs stay the same:

- `filter_push_recipients`
- `user_allows_push_notification`
- `notification_preferences.push_enabled` / category flags

Prefs live only in Supabase (`notification_preferences`).
