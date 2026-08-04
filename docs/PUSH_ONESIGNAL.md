# Push notifications (OneSignal)

TrabaGE uses **OneSignal** as the sole push transport for native OS notifications. Push works for installed PWAs and, where the browser allows it (notably Chrome on Android / desktop), for users who have not installed the app.

Architecture: **PWA → OneSignal SDK → Supabase → Edge Functions → OneSignal REST API → Device**

| Layer | Location |
|-------|----------|
| Client SDK | `src/config/onesignal.js`, `react-onesignal` |
| Device registry | `push_subscriptions` table + RPCs |
| Preferences | `notification_preferences` + `filter_push_recipients` |
| Sender | Edge function `send_push` (OneSignal REST API) |
| Admin broadcasts | `admin_push_broadcast_log`, `scheduled_push_notifications` |

## 1. OneSignal Dashboard setup

1. Go to [OneSignal Dashboard](https://onesignal.com) → Web app **TrabaGE**
2. **Site URL:** `https://trabage.org`
3. **Allowed Origins** (required for local DEV — without these, the SDK throws `Can only be used on: https://trabage.org` and soft-skips init):
   - `https://trabage.org`
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
4. Copy **OneSignal App ID** → Netlify `VITE_ONESIGNAL_APP_ID` + Supabase secret `ONESIGNAL_APP_ID`
5. Copy **REST API Key** → Supabase secret `ONESIGNAL_REST_API_KEY` only (never frontend)
6. (Optional) Safari Web ID → `VITE_ONESIGNAL_SAFARI_WEB_ID`
7. Confirm service worker URL in production: `https://trabage.org/sw.js` (merged PWA + OneSignal). Dev uses `/OneSignalSDKWorker.js`.

## 2. Environment variables

### Netlify (frontend)

```env
VITE_ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_ONESIGNAL_SAFARI_WEB_ID=optional-safari-web-id
VITE_APP_URL=https://trabage.org
```

### Supabase Edge Function secrets (`send_push`)

```bash
supabase secrets set ONESIGNAL_APP_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
supabase secrets set ONESIGNAL_REST_API_KEY="your-rest-api-key"
supabase secrets set APP_URL="https://trabage.org"
# Optional extras (comma-separated). localhost:5173 is already allowlisted in send_push code.
supabase secrets set TRABAGE_ALLOWED_ORIGIN="https://trabage.org"
```

## 3. Database migration

Apply migration **090_onesignal_push_notifications.sql**:

- `push_subscriptions` — per-device OneSignal subscription IDs
- `admin_push_broadcast_log` — admin send history
- `scheduled_push_notifications` — scheduled admin broadcasts
- RPCs: `upsert_push_subscription`, `deactivate_push_subscription`, `admin_resolve_push_audience`, etc.

```bash
supabase db push
```

## 4. Deploy edge function

```bash
supabase functions deploy send_push
```

## 5. Device registration flow

On login (after profile hydrate):

1. `OneSignal.login(user.id)` sets external user ID
2. Push subscription change listener calls `upsert_push_subscription`
3. Same-device fingerprint cleanup deactivates older active rows for the same user + platform + browser (migration **109**)
4. User tags synced from notification preferences (`pref_*` tags)
5. On logout: deactivate subscription **before** `signOut` (RPC needs `auth.uid()`), then `OneSignal.logout()`

Permission is requested **only after login + setup complete** via `PushPermissionPrompt` (not on first app open). A soft `NotificationSetupGuide` may remind later (14-day cooldown). iOS Safari users see home-screen install tips in plain language.

Confirm service worker URL in production: `https://trabage.org/sw.js` (Workbox + OneSignal via `importScripts`). Dev uses `/OneSignalSDKWorker.js`.

## 6. Notification types

| Event | Type key | Preference category |
|-------|----------|---------------------|
| New application (company) | `new_application` | Empleos → Candidaturas |
| Application status change | `application_viewed`, `application_contacted`, `application_accepted`, `application_rejected` | Empleos → Estado postulaciones |
| Job recommendation | `job_recommendation` | Empleos → Ofertas |
| Company/user verified | `verification_*`, `company_verified`, `user_verified` | Empresas → Verificación |
| Internal messages | `new_message`, `conversation_update` | Mensajes → Mensajes nuevos |
| System/admin alerts | `system_update`, `admin_broadcast` | Sistema |
| Marketing | `marketing`, `promotional` | Marketing (opt-in, default off) |

Preference UI lives in `NotificationSettingsScreen` → `NotificationPreferencesPanel` with categories:
**Empleo**, **Cuentas que sigo / Candidaturas**, **Mensajes**, **Sistema**, **Marketing**.

## 7. Deep linking

Notifications include `data.link` (e.g. `/personal/jobs/uuid`). The edge function sets `web_url` for background clicks; foreground clicks use `OneSignal.Notifications` click listener in `onesignal.js`.

### Internal messages

When a user receives a new internal message:

1. DB trigger `notify_new_message` creates an in-app row (unless the recipient is actively viewing that conversation).
2. Sender client calls `dispatchNewMessagePush` → edge function `send_push` → OneSignal.
3. Push payload uses `type: new_message`, `message_id`, `conversation_id`, and `link: /{role}/messages/{conversationId}`.
4. Tapping the notification opens the conversation directly (not the inbox).

**Presence:** while a user has a conversation open, `useMessages` heartbeats `conversation_active_views` every 30s. The trigger and `send_push` skip push when presence is active (within 45s), avoiding duplicate notifications while the chat is on screen.

**Badge:** unread message count syncs to the PWA app icon via the Badging API (`syncAppBadge` in `useUnreadMessagesCount`). iOS pushes use `ios_badgeType: Set` with the current unread count from `get_total_unread_messages_count`.

## 8. Admin panel

`/admin/notifications`:

- Compose title, body, deep link
- Audience: all / personal / business / organization
- Optional city and sector filters
- Schedule datetime or send immediately
- History from `admin_push_broadcast_log`
- **Procesar programados** invokes `send_push` with `{ process_scheduled: true }`

For production scheduling, configure a cron (every 5 min) to POST:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/send_push" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"process_scheduled": true}'
```

## 9. Localhost vs production

| | Localhost (`npm run dev`) | Production (`trabage.org`) |
|--|---------------------------|----------------------------|
| Site URL (OneSignal) | Keep `https://trabage.org` | `https://trabage.org` |
| Allowed origins (OneSignal) | Must include `http://localhost:5173` **and** `http://127.0.0.1:5173` | `https://trabage.org` |
| Service worker | `/OneSignalSDKWorker.js` | `/sw.js` (Workbox + OneSignal) |
| `allowLocalhostAsSecureOrigin` | `true` (DEV) | `false` |
| CORS on `send_push` | Reflects `http://localhost:5173` / `127.0.0.1:5173` if present | Reflects `https://trabage.org` |
| Click-through `web_url` | Often still `https://trabage.org/...` via `APP_URL` | Same |
| Can receive real OS push? | Yes, if permission + subscription + secrets OK | Yes |

**CORS note:** `supabase.functions.invoke('send_push')` from the browser needs the request `Origin` on the Edge allowlist. The Node script `npm run test-onesignal-push` does **not** hit CORS, so a green CLI result does not prove the DEV button works until CORS is deployed.

## 10. Test script + DEV button

Exact copy used by both:

- **Title:** `TrabaGE · Prueba de notificación`
- **Body:** `Esta es una notificación push de prueba. Si puedes verla fuera de TrabaGE, el sistema funciona correctamente.`

```bash
npm run test-onesignal-push
# or
TEST_LOGIN_EMAIL=user@example.com TEST_LOGIN_PASSWORD=secret npm run test-onesignal-push
```

In DEV, Ajustes → Notificaciones → **Enviar notificación push de prueba** runs `getPushDiagnostics()` (permission, SW, subscription, `external_id`) then invokes `send_push` with `test: true` / `system_update`. UI shows human messages only; technical errors go to `reportError`.

Prerequisites:

- Migration 090 applied
- OneSignal secrets on `send_push`
- User logged in on device with push enabled
- OneSignal Allowed Origins includes localhost when testing locally
- `send_push` redeployed with CORS allowlist

## 11. Manual verification (real device / OS banner)

Do **not** mark push as ✅ until you see the **system** notification (OS tray / banner), not only an in-app toast or bell.

### Prerequisites

1. Migration `090_onesignal_push_notifications.sql` applied
2. Frontend: `VITE_ONESIGNAL_APP_ID` in `.env.local` (local) or Netlify (prod) + rebuild
3. Supabase secrets on `send_push`: `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`, `APP_URL`
4. Edge function deployed: `supabase functions deploy send_push`
5. OneSignal Dashboard Allowed Origins match the origin under test

### Checklist (system notification)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| A | Foreground | Tab open → DEV button or test script | OS banner (may also show in-app); distinguish from toast |
| B | Background | Minimize browser/PWA → send again | System notification in tray |
| C | Tab closed | Close tab (SW still registered) → send | System notification in tray |
| D | Device locked | Lock screen if platform allows → send | Lock-screen / tray notification |
| E | Deep link | Tap notification | Opens TrabaGE deep link (prod URL may open even from local test) |

### Broader checklist (Android Chrome PWA / general)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Permission prompt | Fresh login → wait on feed (not login/register) | `PushPermissionPrompt` banner appears once; no prompt on cold open before login |
| 2 | Device registration | Tap **Activar** → check Supabase `push_subscriptions` | Row with `user_id`, `onesignal_subscription_id`, `is_active=true` |
| 3 | App open | Run `npm run test-onesignal-push` or DEV button | System notification; tap opens notifications inbox |
| 4 | Background | Home button → run test | System notification in tray |
| 5 | Closed | Swipe away PWA → run test | System notification in tray |
| 6 | Opt-out | Disable category in settings → trigger event | No in-app or push notification |
| 7 | Dedup | Trigger same event twice within 10 min | Second push skipped (`deduped: 1`) |
| 8 | Admin broadcast | `/admin/notifications` → send to **Todos** | History row; push to opted-in users |
| 9 | Logout | Sign out | `push_subscriptions.is_active=false`; `OneSignal.logout()` |

### Status legend

| Status | When |
|--------|------|
| ✅ PUSH REAL VERIFICADO | Evidence of OS system notification on a named browser/OS |
| 🟡 PUSH CORREGIDO PERO REQUIERE PRUEBA MANUAL | Code/CORS/diagnostics ready; awaiting visual confirmation |
| ⚠️ BLOQUEADO POR CONFIGURACIÓN EXTERNA | Missing App ID, Allowed Origins, secrets, or OS permission |
| ❌ PUSH NO FUNCIONAL | Structural failure after full diagnostics |

## 12. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Console: `Can only be used on: https://trabage.org` | OneSignal Allowed Origins missing your DEV origin. Add `http://localhost:5173` and `http://127.0.0.1:5173` (Dashboard → Platforms → Web). App soft-skips init with one warning; real push needs those origins or use production. |
| No permission prompt | Check `VITE_ONESIGNAL_APP_ID` in `.env.local` / Netlify + restart/redeploy |
| Subscription not in DB | Login + grant permission; check browser console / `getPushDiagnostics` |
| `OneSignal no configurado` | Set Supabase secrets on `send_push` |
| Push skipped | User `push_enabled=false` or category disabled |
| Browser invoke fails CORS on localhost | Redeploy `send_push` (allowlist includes `http://localhost:5173`) |
| CLI works, DEV button fails | Almost always CORS or missing browser subscription/permission |
| Workbox swallows OneSignal | `globIgnores` in `vite.config.js` (already set) |
| Only toast/bell, no OS banner | Not verified — confirm OneSignal delivery + OS permission; close tab and retest |

## 13. Security

- OneSignal REST API key: **Supabase secrets only**
- Clients register via `upsert_push_subscription` (rate-limited RPC)
- `send_push` validates auth; bulk sends require matching in-app notification (10 min window)
- Admin broadcasts require admin role
