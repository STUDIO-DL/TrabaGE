# Profile completion reminder (ops)

Server-side delayed email (Resend) for incomplete profiles. Separate from welcome.

## Flow

1. At registration complete, client calls `enqueue_profile_completion_reminder_if_needed` (via `queueWelcomeEmailOnRegistrationComplete`).
2. Row inserted with `eligible_at = auth.users.created_at + 10 minutes`, status `pending`.
3. Cron every 5 minutes POSTs Edge Function `send_profile_completion_reminder`.
4. Function claims due rows → recomputes live `get_profile_completion` → cancels if sufficient / inactive / prefs off → else Resend once → `sent`.

## Vault secrets (required for cron)

Set in Supabase Vault (Dashboard → Database → Vault or SQL):

```sql
select vault.create_secret(
  'https://jqzbpdojwzopwuaapqgl.supabase.co/functions/v1/send_profile_completion_reminder',
  'profile_completion_reminder_url'
);

select vault.create_secret(
  '<SERVICE_ROLE_KEY_OR_SHARED_SECRET>',
  'profile_completion_reminder_auth'
);
```

Edge Function also accepts header `x-profile-reminder-secret` matching env:

- `PROFILE_COMPLETION_REMINDER_SECRET` or `PROFILE_REMINDER_WEBHOOK_SECRET`

Authorization Bearer may be the service role key (same pattern as welcome).

After vault secrets exist, re-run migration scheduling block or:

```sql
-- Re-apply cron schedule by re-running the DO $$ … cron.schedule block from migration 120
```

## Edge Function secrets

- `RESEND_API_KEY` (existing)
- `RESEND_AUTH_FROM_EMAIL` / defaults to `noreply@trabage.org`
- `APP_URL` optional (default `https://trabage.org`)
- `PROFILE_COMPLETION_REMINDER_SECRET` optional if cron uses service role Bearer only

## Preference gate

Uses `notification_preferences.system_updates` (defaults true). If user disables system alerts, reminder is cancelled.

## Manual invoke

```bash
curl -X POST "$SUPABASE_URL/functions/v1/send_profile_completion_reminder" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source":"manual","limit":20}'
```
