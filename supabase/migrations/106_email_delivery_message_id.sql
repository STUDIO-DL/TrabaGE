-- 106_email_delivery_message_id.sql
-- Optional Resend message id for password-changed and goodbye monitoring.

ALTER TABLE public.password_changed_email_logs
  ADD COLUMN IF NOT EXISTS provider_message_id text;

ALTER TABLE public.account_goodbye_email_logs
  ADD COLUMN IF NOT EXISTS provider_message_id text;

ALTER TABLE public.account_goodbye_email_outbox
  ADD COLUMN IF NOT EXISTS provider_message_id text;
