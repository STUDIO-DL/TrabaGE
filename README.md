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
supabase functions deploy send_push
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run preview` | Preview del build |
