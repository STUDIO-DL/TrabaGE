# TrabaGE — Runbook OPS pre-lanzamiento (beta)

Referencia operativa para **Netlify**, **Supabase**, **Resend**, **OneSignal** y **Sentry**.  
Proyecto Supabase: `jqzbpdojwzopwuaapqgl` · Netlify: `trabage` · Dominio: `https://trabage.org`

> **Regla:** nunca commitear secretos. Los valores van solo en dashboards o `supabase secrets set`.

---

## 1. Variables de entorno

### 1.1 Netlify (frontend — scope Production)

| Variable | Obligatoria | Dónde obtenerla |
|----------|-------------|-----------------|
| `VITE_SUPABASE_URL` | Sí | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Sí | Supabase → API → anon / publishable key (`sb_publishable_...`) |
| `VITE_APP_URL` | Sí | `https://trabage.org` |
| `VITE_APP_ENV` | Sí | `production` (también en `netlify.toml` → `[build.environment]`) |
| `VITE_ONESIGNAL_APP_ID` | Sí (push) | OneSignal → Settings → Keys & IDs → OneSignal App ID |
| `VITE_ONESIGNAL_SAFARI_WEB_ID` | No | OneSignal → Safari Web ID (solo Safari/macOS) |
| `VITE_SENTRY_DSN` | Recomendada | Sentry → Project → Client Keys (DSN) |

**Pasos Netlify**

1. [Netlify → trabage → Environment variables](https://app.netlify.com/projects/trabage/configuration/env)
2. Contexto **Production** (y **All** si prefieres un solo set).
3. Añadir/verificar las variables de la tabla.
4. **Deploys → Trigger deploy → Clear cache and deploy site** (obligatorio tras cambiar `VITE_*`).

**CLI local** (si `netlify-cli` no está global: `npx netlify-cli`):

```bash
npx netlify-cli status
npx netlify-cli env:list --json
```

---

### 1.2 Supabase Edge Functions (secrets — server-side)

| Secret | Funciones | Notas |
|--------|-----------|-------|
| `SUPABASE_URL` | Todas | Auto-inyectado por Supabase |
| `SUPABASE_ANON_KEY` | `send_push` | Auto-inyectado |
| `SUPABASE_SERVICE_ROLE_KEY` | welcome, push, matching | Dashboard → API → service_role |
| `RESEND_API_KEY` | auth + welcome | [Resend → API Keys](https://resend.com/api-keys) |
| `RESEND_AUTH_FROM_EMAIL` | `send_auth_email` | ej. `noreply@trabage.org` |
| `RESEND_WELCOME_FROM_EMAIL` | `send_welcome_email` | ej. `welcome@trabage.org` |
| `RESEND_FROM_NAME` | auth + welcome | ej. `TrabaGE` |
| `SEND_EMAIL_HOOK_SECRET` | `send_auth_email` | Generado en Auth Hook (ver §2.1) |
| `WELCOME_WEBHOOK_SECRET` | `send_welcome_email` | String aleatorio; mismo valor en Database Webhook |
| `TRABAGE_ALLOWED_ORIGIN` | CORS en varias | `https://trabage.org` |
| `ONESIGNAL_APP_ID` | `send_push` | Mismo App ID que frontend |
| `ONESIGNAL_REST_API_KEY` | `send_push` | OneSignal → REST API Key (**nunca** en Netlify) |
| `APP_URL` | welcome (CTA links) | Opcional; default `https://trabage.org` |
| `MATCHING_RECALC_SECRET` | `process_matching_recalc` | **Pendiente** — generar y configurar cron |

**Legacy (pueden eliminarse si el hook Resend está activo):** `SMTP_*`, `RESEND_FROM_NAM` (typo).

**CLI**

```bash
supabase secrets list
supabase secrets set MATCHING_RECALC_SECRET="genera-un-secreto-largo"
supabase secrets set APP_URL="https://trabage.org"
```

---

## 2. Supabase Dashboard (manual)

### 2.1 Auth → Hooks → Send Email (Resend)

1. [Authentication → Hooks](https://supabase.com/dashboard/project/jqzbpdojwzopwuaapqgl/auth/hooks)
2. **Send Email** → Enable → Type: **HTTPS**
3. **URL:** `https://jqzbpdojwzopwuaapqgl.supabase.co/functions/v1/send_auth_email`
4. **Generate secret** → copiar valor completo (`v1,whsec_...`)
5. Guardar el mismo valor en Edge Function secret: `SEND_EMAIL_HOOK_SECRET`
6. Guardar hook en Dashboard.

La función debe estar desplegada con **`--no-verify-jwt`** (Auth no envía JWT de usuario).

### 2.2 Auth → URL Configuration

- **Site URL:** `https://trabage.org`
- **Redirect URLs** (exactas):
  - `http://localhost:5173/auth/callback`
  - `http://localhost:5173/auth/confirm`
  - `https://trabage.org/auth/callback`
  - `https://trabage.org/auth/confirm`
  - `https://www.trabage.org/auth/callback`
  - `https://www.trabage.org/auth/confirm`

### 2.3 Auth → Providers → Google

1. Supabase: activar Google con Client ID + Secret de Google Cloud.
2. Google Cloud Console → OAuth client → **Authorized redirect URIs:**
   `https://jqzbpdojwzopwuaapqgl.supabase.co/auth/v1/callback`

### 2.4 Auth → Email

- **Confirm email:** ON (requerido para beta con verificación).

### 2.5 Database → Webhooks → Welcome email

1. [Database → Webhooks](https://supabase.com/dashboard/project/jqzbpdojwzopwuaapqgl/database/hooks)
2. **Create hook** → evento **INSERT** en tabla `public.welcome_email_outbox`
3. **URL:** `https://jqzbpdojwzopwuaapqgl.supabase.co/functions/v1/send_welcome_email`
4. **HTTP Headers:**
   - `x-welcome-webhook-secret`: `<WELCOME_WEBHOOK_SECRET>` (mismo que en secrets)
   - `Authorization`: `Bearer <SUPABASE_SERVICE_ROLE_KEY>`
5. Guardar.

### 2.6 Cron — `process_matching_recalc`

Opciones:

- **Supabase Cron** (pg_cron + `net.http_post`) o scheduler externo (GitHub Actions, cron-job.org).
- **POST** `https://jqzbpdojwzopwuaapqgl.supabase.co/functions/v1/process_matching_recalc`
- **Headers:** `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`  
  o `x-matching-recalc-secret: <MATCHING_RECALC_SECRET>`
- **Body:** `{"limit": 25}` cada 1–5 minutos.
- **Nunca** exponer esta URL al navegador.

### 2.7 Storage

Verificar buckets y políticas: `candidate-avatars`, `company-logos`, `post-images`, `candidate-cvs`, `company-verifications`, `candidate-education-files`.

---

## 3. Resend — dominio `trabage.org`

### 3.1 Verificación DNS

1. [Resend → Domains → Add domain](https://resend.com/domains) → `trabage.org`
2. Añadir en el DNS del dominio (registrar / Cloudflare / etc.):

| Tipo | Host | Propósito |
|------|------|-----------|
| TXT | `@` o según Resend | SPF (incluye `include:amazonses.com` o lo que indique Resend) |
| CNAME | `resend._domainkey` (o subdominios DKIM que muestre Resend) | DKIM |
| TXT | `_dmarc` | DMARC recomendado: `v=DMARC1; p=none; rua=mailto:...` (ajustar política en producción) |

3. Esperar estado **Verified** en Resend.
4. Crear API key con permiso **Sending**.
5. Secrets Supabase: `RESEND_API_KEY`, `RESEND_AUTH_FROM_EMAIL=noreply@trabage.org`, `RESEND_WELCOME_FROM_EMAIL=welcome@trabage.org`, `RESEND_FROM_NAME=TrabaGE`.

### 3.2 Prueba rápida post-config

- Registro → email de confirmación (hook `send_auth_email`).
- Confirmar → fila en `welcome_email_outbox` → email de bienvenida (`send_welcome_email`).
- Recuperar contraseña → email recovery.

---

## 4. OneSignal

1. [OneSignal Dashboard](https://onesignal.com) → App web TrabaGE
2. **Site URL:** `https://trabage.org`
3. **Allowed origins:** `https://trabage.org`, `http://localhost:5173`
4. Copiar **App ID** → Netlify `VITE_ONESIGNAL_APP_ID` + secret `ONESIGNAL_APP_ID`
5. **REST API Key** → solo Supabase `ONESIGNAL_REST_API_KEY`
6. (Opcional) Safari Web ID → `VITE_ONESIGNAL_SAFARI_WEB_ID`

---

## 5. Sentry

1. Crear proyecto (React / JavaScript).
2. Copiar DSN → Netlify `VITE_SENTRY_DSN` (Production).
3. Redeploy Netlify.
4. Provocar un error de prueba en staging/prod y verificar evento en Sentry.

---

## 6. Despliegue Edge Functions (CLI)

Desde la raíz del repo (`TrabaGE/`):

```bash
supabase functions deploy send_auth_email --no-verify-jwt
supabase functions deploy send_welcome_email
supabase functions deploy send_push
supabase functions deploy match_job_recommendations
supabase functions deploy process_matching_recalc
```

Alternativa Windows: `scripts\deploy-all-edge-functions.cmd`

Scripts API Management (sin Docker): `scripts\deploy-auth-email-api.ps1`, `scripts\deploy-welcome-email-api.ps1`

**Migraciones**

```bash
supabase migration list   # Local y Remote deben coincidir hasta 073
supabase db push          # solo si Remote va retrasado
```

---

## 7. Checklist rápido pre-beta

| # | Item | Estado |
|---|------|--------|
| 1 | Migraciones 001–073 aplicadas en remoto | Verificar con CLI |
| 2 | Edge functions desplegadas (5) | Verificar con CLI |
| 3 | Secrets Supabase (Resend, hooks, OneSignal) | Dashboard / `secrets list` |
| 4 | Auth Send Email hook activo + secreto alineado | Dashboard |
| 5 | Webhook `welcome_email_outbox` | Dashboard |
| 6 | Resend dominio verificado | Resend Dashboard |
| 7 | Netlify env Production completo | Netlify Dashboard |
| 8 | Redeploy Netlify tras env | Manual |
| 9 | Google OAuth producción | Supabase + Google Cloud |
| 10 | OneSignal origins + keys | OneSignal + secrets |
| 11 | Sentry DSN en Netlify | Netlify |
| 12 | Cron `process_matching_recalc` + `MATCHING_RECALC_SECRET` | Dashboard |
| 13 | Smoke: registro, confirm, welcome, reset password | Manual |
| 14 | Smoke: push, PWA install, `/` `/login` `/register` | Manual |

Ver también: `PRODUCTION_LAUNCH_CHECKLIST.md` (lista completa de go-live).

---

## 8. URLs útiles

- Supabase project: https://supabase.com/dashboard/project/jqzbpdojwzopwuaapqgl
- Netlify admin: https://app.netlify.com/projects/trabage
- Sitio: https://trabage.org
