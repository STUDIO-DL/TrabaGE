-- Structured contact fields for shared opportunities. Keep contact_method for legacy rows.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;