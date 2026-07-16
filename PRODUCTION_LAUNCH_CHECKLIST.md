# TrabaGE — Production Launch Checklist

Use this list before inviting real users. Items marked **OPS** require Dashboard/Netlify actions (cannot be completed from code alone).

## 1. Frontend / Netlify

- [ ] **OPS** Site domain: `trabage.org` (+ `www` → apex redirect already in `netlify.toml`)
- [ ] **OPS** Netlify env (Production):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_APP_URL=https://trabage.org`
  - `VITE_APP_ENV=production` (also set in `netlify.toml`)
  - `VITE_ONESIGNAL_APP_ID`
  - `VITE_ONESIGNAL_SAFARI_WEB_ID` (optional, Safari)
  - `VITE_SENTRY_DSN` (recommended)
- [ ] Trigger a fresh production deploy after setting env vars
- [ ] Smoke test: `/`, `/login`, `/register`, install PWA, dark mode

## 2. Supabase (Database + Auth + Storage)

- [ ] **OPS** `supabase db push` (or linked migrate) through **065_production_security_hardening.sql**
- [ ] **OPS** Auth → URL Configuration:
  - Site URL: `https://trabage.org`
  - Redirect URLs include `/auth/callback` and `/auth/confirm` for apex + www + localhost
- [ ] **OPS** Auth → Providers → Google enabled with production redirect URI
- [ ] **OPS** Auth → Email: **Confirm email = ON**
- [ ] **OPS** Auth → SMTP configured (custom SMTP, not default rate-limited)
- [ ] **OPS** Auth email templates:
  - Confirmation link uses `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`
  - Recovery template active (repo: `supabase/templates/recovery.html`)
- [ ] **OPS** Storage buckets present & policies applied: `candidate-avatars`, `company-logos`, `post-images`, `candidate-cvs`, `company-verifications`
- [ ] **OPS** Verify RLS smoke tests (other user cannot read CVs / edit foreign profiles / open admin)

## 3. Edge Functions + Secrets

Deploy:

```bash
supabase functions deploy send_welcome_email
supabase functions deploy send_push
supabase functions deploy match_job_recommendations
supabase functions deploy process_matching_recalc
```

- [ ] **OPS** Secrets set:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_URL` / `SUPABASE_ANON_KEY` (if not auto-injected)
  - `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`
  - `TRABAGE_ALLOWED_ORIGIN=https://trabage.org`
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (or `SMTP_PASSWORD`)
  - `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`
  - `WELCOME_WEBHOOK_SECRET`
  - `MATCHING_RECALC_SECRET`
- [ ] **OPS** Database Webhook on `welcome_email_outbox` INSERT → `send_welcome_email` with secret header
- [ ] **OPS** Cron/scheduler for `process_matching_recalc` with service role or matching secret (never public)

## 4. Emails

- [ ] **OPS** Register → receive confirmation → `/auth/confirm` succeeds
- [ ] **OPS** Forgot password → recovery email → set new password
- [ ] **OPS** Welcome email after signup (outbox + function)
- [ ] **OPS** Account deletion path still works (no orphaned private files)

## 5. OneSignal

- [ ] **OPS** Web push app site URL = `https://trabage.org`
- [ ] **OPS** Allowed origins include production (+ localhost for dev)
- [ ] Permission prompt works on Android Chrome + desktop PWA
- [ ] In-app notification preferences sync tags
- [ ] `send_push` rejects raw `player_id` from clients (code already enforces)

## 6. PWA

- [ ] `manifest.json` installs (name TrabaGE, icons 192/512 + maskable)
- [ ] Service worker auto-update (`registerType: autoUpdate`)
- [ ] OneSignal workers not swallowed by Workbox (`globIgnores` set)
- [ ] Offline navigate fallback to `index.html` (configured in `vite.config.js`)

## 7. Observability

- [ ] **OPS** Sentry project receiving events (`VITE_SENTRY_DSN`)
- [ ] Client logs: only DEV `console` via `reportError` / supabase warn

## 8. Security gate (must pass)

- [ ] No `SERVICE_ROLE` / SMTP / OneSignal REST in frontend bundle
- [ ] Migration **065** applied on remote (OneSignal column revoke + public views)
- [ ] Admin routes unreachable for non-admin (RLS + RoleRoute)
- [ ] CSP + HSTS headers live on Netlify

## 9. Go / No-Go

Launch only when sections **2, 3, 4** and **8** are checked.

Remaining polish (non-blocking): admin dark-mode leftovers, replace `window.confirm` in company feed, feed virtualization.
