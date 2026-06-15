-- =============================================
-- 008_candidate_services_and_years.sql
-- Services offered + years of experience on profile
-- =============================================

ALTER TABLE candidate_profiles
  ADD COLUMN IF NOT EXISTS years_experience INTEGER
  CHECK (years_experience IS NULL OR (years_experience >= 0 AND years_experience <= 50));

CREATE TABLE IF NOT EXISTS public.services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read services" ON services FOR SELECT USING (TRUE);

CREATE POLICY "Own services insert" ON services
  FOR INSERT TO authenticated
  WITH CHECK (candidate_id = auth.uid());

CREATE POLICY "Own services delete" ON services
  FOR DELETE TO authenticated
  USING (candidate_id = auth.uid());
