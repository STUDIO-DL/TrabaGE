-- =============================================
-- 013_company_services_and_contact.sql
-- Optional company services + HR / representative contact
-- =============================================

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_role TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;

CREATE TABLE IF NOT EXISTS public.company_services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.company_profiles(user_id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_services_company_id
  ON public.company_services(company_id);

CREATE INDEX IF NOT EXISTS idx_company_services_name
  ON public.company_services(company_id, lower(name));

ALTER TABLE public.company_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read company services" ON public.company_services;
CREATE POLICY "Public read company services"
  ON public.company_services FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Own company services insert" ON public.company_services;
CREATE POLICY "Own company services insert"
  ON public.company_services FOR INSERT TO authenticated
  WITH CHECK (company_id = auth.uid());

DROP POLICY IF EXISTS "Own company services delete" ON public.company_services;
CREATE POLICY "Own company services delete"
  ON public.company_services FOR DELETE TO authenticated
  USING (company_id = auth.uid());

GRANT SELECT ON public.company_services TO anon, authenticated;
GRANT INSERT, DELETE ON public.company_services TO authenticated;
