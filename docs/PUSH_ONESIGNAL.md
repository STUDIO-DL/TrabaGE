# Push notifications (OneSignal)

TrabaGE uses **OneSignal** as the sole push transport for native OS notifications on installed Android PWAs and desktop browsers.

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
3. **Allowed origins:** `https://trabage.org`, `http://localhost:5173`
4. Copy **OneSignal App ID** → Netlify `VITE_ONESIGNAL_APP_ID` + Supabase secret `ONESIGNAL_APP_ID`
5. Copy **REST API Key** → Supabase secret `ONESIGNAL_REST_API_KEY` only (never frontend)
6. (Optional) Safari Web ID → `VITE_ONESIGNAL_SAFARI_WEB_ID`
7. Confirm service worker URL: `https://trabage.org/OneSignalSDKWorker.js`

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
3. User tags synced from notification preferences (`pref_*` tags)
4. On logout: `OneSignal.logout()` + `deactivate_push_subscription`

Permission is requested **only after login** via `PushPermissionPrompt` (not on first app open).

## 6. Notification types

| Event | Type key | Preference category |
|-------|----------|---------------------|
| New application (company) | `new_application` | Empleos → Candidaturas |
| Application status change | `application_viewed`, `application_contacted`, `application_accepted`, `application_rejected` | Empleos → Estado postulaciones |
| Job recommendation | `job_recommendation` | Empleos → Ofertas |
| Company/user verified | `verification_*`, `company_verified`, `user_verified` | Empresas → Verificación |
| Internal messages (stub) | `new_message`, `conversation_update` | Mensajes |
| System/admin alerts | `system_update`, `admin_broadcast` | Sistema |
| Marketing | `marketing`, `promotional` | Marketing (opt-in, default off) |

Preference UI lives in `NotificationSettingsScreen` → `NotificationPreferencesPanel` with categories:
**Empleo**, **Cuentas que sigo / Candidaturas**, **Mensajes**, **Sistema**, **Marketing**.

## 7. Deep linking

Notifications include `data.link` (e.g. `/personal/jobs/uuid`). The edge function sets `web_url` for background clicks; foreground clicks use `OneSignal.Notifications` click listener in `onesignal.js`.

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

## 9. Test script

```bash
npm run test-onesignal-push
# or
TEST_LOGIN_EMAIL=user@example.com TEST_LOGIN_PASSWORD=secret npm run test-onesignal-push
```

Prerequisites:

- Migration 090 applied
- OneSignal secrets on `send_push`
- User logged in on device with push enabled

## 10. Manual verification (Android Chrome PWA)

### Prerequisites

1. Migration `090_onesignal_push_notifications.sql` applied
2. Netlify: `VITE_ONESIGNAL_APP_ID` set + redeploy
3. Supabase secrets on `send_push`: `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`, `APP_URL`
4. Edge function deployed: `supabase functions deploy send_push`

### Checklist

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Permission prompt | Fresh login → wait on feed (not login/register) | `PushPermissionPrompt` banner appears once; no prompt on cold open before login |
| 2 | Device registration | Tap **Activar** → check Supabase `push_subscriptions` | Row with `user_id`, `onesignal_subscription_id`, `platform=android`, `is_active=true` |
| 3 | App open | Run `npm run test-onesignal-push` | Toast/banner or system notification; tap opens `/personal/notifications` |
| 4 | Background | Home button → run test script | System notification in tray; tap opens deep link |
| 5 | Closed | Swipe away PWA → run test script | System notification in tray |
| 6 | Opt-out | Disable **Estado de mis postulaciones** in settings → company changes application status | In-app notification only; no push |
| 7 | Dedup | Trigger same event twice within 10 min | Second push skipped (`deduped: 1` in edge response) |
| 8 | Admin broadcast | `/admin/notifications` → send to **Todos** | History row in `admin_push_broadcast_log`; push to opted-in users |
| 9 | Logout | Sign out | `push_subscriptions.is_active=false` for device; `OneSignal.logout()` |

## 11. Troubleshooting

| Symptom | Fix |
|---------|-----|
| No permission prompt | Check `VITE_ONESIGNAL_APP_ID` in Netlify + redeploy |
| Subscription not in DB | Login + grant permission; check browser console |
| `OneSignal no configurado` | Set Supabase secrets on `send_push` |
| Push skipped | User `push_enabled=false` or category disabled |
| Workbox swallows OneSignal | `globIgnores` in `vite.config.js` (already set) |

## 12. Security

- OneSignal REST API key: **Supabase secrets only**
- Clients register via `upsert_push_subscription` (rate-limited RPC)
- `send_push` validates auth; bulk sends require matching in-app notification (10 min window)
- Admin broadcasts require admin role
