# TrabaGE

PWA de empleo para Guinea Ecuatorial — "Donde las oportunidades te encuentran".

## Stack

- React 19 + Vite
- Tailwind CSS
- Supabase (Auth, DB, Storage)
- OneSignal (push) · Sentry (errors)

## Setup

```bash
npm install
cp .env.example .env.local
# Editar .env.local con credenciales de Supabase
npm run dev
```

## Supabase

```bash
supabase link --project-ref YOUR_REF
supabase db push
supabase functions deploy send_auth_email --no-verify-jwt
supabase functions deploy send_push
supabase functions deploy send_welcome_email
```

### Auth + welcome emails (Resend)

1. **Resend Dashboard**: verify domain `trabage.org`, create API key
2. **Edge Functions → Secrets**: `RESEND_API_KEY`, `RESEND_AUTH_FROM_EMAIL`, `RESEND_WELCOME_FROM_EMAIL`, `RESEND_FROM_NAME`, `SEND_EMAIL_HOOK_SECRET`, `WELCOME_WEBHOOK_SECRET`
3. **Authentication → Hooks → Send Email**: HTTPS → `send_auth_email` function URL → Generate Secret
4. **Database → Webhooks**: `INSERT` on `welcome_email_outbox` → `send_welcome_email`

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run preview` | Preview del build |
