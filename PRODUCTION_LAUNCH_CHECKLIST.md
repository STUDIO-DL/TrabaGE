# TrabaGE — Production Launch Checklist

Use this list before inviting real users. Items marked **OPS** require Dashboard/Netlify actions (cannot be completed from code alone).

**Runbook detallado (pasos Dashboard):** [`docs/OPS_LAUNCH.md`](docs/OPS_LAUNCH.md)

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

- [ ] **OPS** `supabase db push` (or linked migrate) through **076_profile_persistence_fixes.sql**
  - **066** — Admin RPCs aligned with personal/business/organization roles (post-064)
  - **067** — Structured job `role` field ("El puesto")
  - **068** — Welcome email personalization by account type
  - **069** — Education form enhancements + `candidate-education-files` storage bucket
  - **070** — Candidate intro fields (sector, education in header)
  - **071** — Prelaunch audit: follow policies + feed RPC employer role fixes
  - **072** — Revoke client access to `upsert_job_matches` (server-side only)
  - **074** — Welcome email client fallback
  - **075** — Unified profile provisioning
  - **076** — Profile persistence fixes
- [ ] **OPS** Auth → URL Configuration:
  - Site URL: `https://trabage.org`
  - Redirect URLs include `/auth/callback` and `/auth/confirm` for apex + www + localhost
- [ ] **OPS** Auth → Providers → Google enabled with production redirect URI
- [ ] **OPS** Auth → Email: **Confirm email = ON**
- [ ] **OPS** Auth → Hooks → **Send Email** → `send_auth_email` (Resend, not Supabase SMTP)
- [ ] **OPS** Resend: domain `trabage.org` verified, API key in Edge Function secrets
- [ ] **OPS** Storage buckets present & policies applied: `candidate-avatars`, `company-logos`, `post-images`, `candidate-cvs`, `company-verifications`, `candidate-education-files`
- [ ] **OPS** Verify RLS smoke tests (other user cannot read CVs / edit foreign profiles / open admin)

## 3. Edge Functions + Secrets

Deploy:

```bash
supabase functions deploy send_auth_email --no-verify-jwt
supabase functions deploy send_welcome_email
supabase functions deploy send_push
supabase functions deploy match_job_recommendations
supabase functions deploy process_matching_recalc
```

Windows: `scripts\deploy-all-edge-functions.cmd`

- [ ] **OPS** Secrets set:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_URL` / `SUPABASE_ANON_KEY` (if not auto-injected)
  - `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`
  - `TRABAGE_ALLOWED_ORIGIN=https://trabage.org`
  - `RESEND_API_KEY`, `RESEND_AUTH_FROM_EMAIL`, `RESEND_WELCOME_FROM_EMAIL`, `RESEND_FROM_NAME`
  - `SEND_EMAIL_HOOK_SECRET`
  - `WELCOME_WEBHOOK_SECRET`
  - `MATCHING_RECALC_SECRET`
- [ ] **OPS** Auth Hook: Send Email → `send_auth_email` with generated secret
- [ ] **OPS** Database Webhook on `welcome_email_outbox` INSERT → `send_welcome_email` with secret header
- [ ] **OPS** Cron/scheduler for `process_matching_recalc` with service role or matching secret (never public)

## 4. Emails

- [ ] **OPS** Register → receive confirmation → `/auth/confirm` succeeds
- [ ] **OPS** Forgot password → recovery email → set new password
- [ ] **OPS** Welcome email after signup (outbox + function; account type from **068**)
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
- [ ] Migration **065–076** applied on remote (OneSignal column revoke, public views, admin/feed fixes, job matches revoke, profile persistence)
- [ ] Admin routes unreachable for non-admin (RLS + RoleRoute)
- [ ] CSP + HSTS headers live on Netlify

## 9. Go / No-Go

Launch only when sections **2, 3, 4** and **8** are checked.

Remaining polish (non-blocking): admin dark-mode leftovers, replace `window.confirm` in company feed, feed virtualization.
