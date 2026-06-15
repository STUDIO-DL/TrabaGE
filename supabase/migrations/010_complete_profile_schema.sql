-- =============================================
-- 010_complete_profile_schema.sql
-- Idempotent sync: all candidate profile sections + app tables
-- =============================================

-- ── Core profile (hero, about, contact, documents, preferences) ─────────────

CREATE TABLE IF NOT EXISTS public.candidate_profiles (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name          TEXT NOT NULL,
  headline           TEXT,
  about              TEXT,
  avatar_url         TEXT,
  city               TEXT,
  years_experience   INTEGER CHECK (years_experience IS NULL OR (years_experience >= 0 AND years_experience <= 50)),
  cv_url             TEXT,
  cv_name            TEXT,
  cover_letter_url   TEXT,
  cover_letter_name  TEXT,
  contact_email      TEXT,
  contact_whatsapp   TEXT,
  job_preferences    JSONB NOT NULL DEFAULT '{}'::jsonb,
  setup_complete     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS about TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS years_experience INTEGER,
  ADD COLUMN IF NOT EXISTS cv_url TEXT,
  ADD COLUMN IF NOT EXISTS cv_name TEXT,
  ADD COLUMN IF NOT EXISTS cover_letter_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_letter_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS job_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS setup_complete BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'candidate_profiles_years_experience_check'
  ) THEN
    ALTER TABLE public.candidate_profiles
      ADD CONSTRAINT candidate_profiles_years_experience_check
      CHECK (years_experience IS NULL OR (years_experience >= 0 AND years_experience <= 50));
  END IF;
END $$;

-- ── Education ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.education (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  institution   TEXT NOT NULL,
  program       TEXT,
  grade         TEXT,
  start_date    DATE,
  end_date      DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Experience ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.experience (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  company       TEXT NOT NULL,
  position      TEXT NOT NULL,
  description   TEXT,
  start_date    DATE,
  end_date      DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Certifications ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.certifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  issuer        TEXT,
  issued_date   DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Skills ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.skills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Services offered ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Languages ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.languages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES public.candidate_profiles(user_id) ON DELETE CASCADE,
  language      TEXT NOT NULL,
  level         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_education_candidate_id ON public.education(candidate_id);
CREATE INDEX IF NOT EXISTS idx_experience_candidate_id ON public.experience(candidate_id);
CREATE INDEX IF NOT EXISTS idx_certifications_candidate_id ON public.certifications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_skills_candidate_id ON public.skills(candidate_id);
CREATE INDEX IF NOT EXISTS idx_services_candidate_id ON public.services(candidate_id);
CREATE INDEX IF NOT EXISTS idx_languages_candidate_id ON public.languages(candidate_id);
CREATE INDEX IF NOT EXISTS idx_skills_name ON public.skills(candidate_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_services_name ON public.services(candidate_id, lower(name));

-- ── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;

-- Public read (public profile)
DROP POLICY IF EXISTS "Public read education" ON public.education;
CREATE POLICY "Public read education" ON public.education FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read experience" ON public.experience;
CREATE POLICY "Public read experience" ON public.experience FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read certs" ON public.certifications;
CREATE POLICY "Public read certs" ON public.certifications FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read skills" ON public.skills;
CREATE POLICY "Public read skills" ON public.skills FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read services" ON public.services;
CREATE POLICY "Public read services" ON public.services FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read languages" ON public.languages;
CREATE POLICY "Public read languages" ON public.languages FOR SELECT USING (TRUE);

-- Education
DROP POLICY IF EXISTS "Own education" ON public.education;
DROP POLICY IF EXISTS "Own education insert" ON public.education;
DROP POLICY IF EXISTS "Own education update" ON public.education;
DROP POLICY IF EXISTS "Own education delete" ON public.education;
CREATE POLICY "Own education insert" ON public.education FOR INSERT TO authenticated WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own education update" ON public.education FOR UPDATE TO authenticated USING (candidate_id = auth.uid()) WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own education delete" ON public.education FOR DELETE TO authenticated USING (candidate_id = auth.uid());

-- Experience
DROP POLICY IF EXISTS "Own experience" ON public.experience;
DROP POLICY IF EXISTS "Own experience insert" ON public.experience;
DROP POLICY IF EXISTS "Own experience update" ON public.experience;
DROP POLICY IF EXISTS "Own experience delete" ON public.experience;
CREATE POLICY "Own experience insert" ON public.experience FOR INSERT TO authenticated WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own experience update" ON public.experience FOR UPDATE TO authenticated USING (candidate_id = auth.uid()) WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own experience delete" ON public.experience FOR DELETE TO authenticated USING (candidate_id = auth.uid());

-- Certifications
DROP POLICY IF EXISTS "Own certs" ON public.certifications;
DROP POLICY IF EXISTS "Own certs insert" ON public.certifications;
DROP POLICY IF EXISTS "Own certs update" ON public.certifications;
DROP POLICY IF EXISTS "Own certs delete" ON public.certifications;
CREATE POLICY "Own certs insert" ON public.certifications FOR INSERT TO authenticated WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own certs update" ON public.certifications FOR UPDATE TO authenticated USING (candidate_id = auth.uid()) WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own certs delete" ON public.certifications FOR DELETE TO authenticated USING (candidate_id = auth.uid());

-- Skills
DROP POLICY IF EXISTS "Own skills" ON public.skills;
DROP POLICY IF EXISTS "Own skills insert" ON public.skills;
DROP POLICY IF EXISTS "Own skills delete" ON public.skills;
CREATE POLICY "Own skills insert" ON public.skills FOR INSERT TO authenticated WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own skills delete" ON public.skills FOR DELETE TO authenticated USING (candidate_id = auth.uid());

-- Services
DROP POLICY IF EXISTS "Own services insert" ON public.services;
DROP POLICY IF EXISTS "Own services delete" ON public.services;
CREATE POLICY "Own services insert" ON public.services FOR INSERT TO authenticated WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own services delete" ON public.services FOR DELETE TO authenticated USING (candidate_id = auth.uid());

-- Languages
DROP POLICY IF EXISTS "Own languages" ON public.languages;
DROP POLICY IF EXISTS "Own languages insert" ON public.languages;
DROP POLICY IF EXISTS "Own languages update" ON public.languages;
DROP POLICY IF EXISTS "Own languages delete" ON public.languages;
CREATE POLICY "Own languages insert" ON public.languages FOR INSERT TO authenticated WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own languages update" ON public.languages FOR UPDATE TO authenticated USING (candidate_id = auth.uid()) WITH CHECK (candidate_id = auth.uid());
CREATE POLICY "Own languages delete" ON public.languages FOR DELETE TO authenticated USING (candidate_id = auth.uid());

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT SELECT ON public.education TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education TO authenticated;

GRANT SELECT ON public.experience TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience TO authenticated;

GRANT SELECT ON public.certifications TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certifications TO authenticated;

GRANT SELECT ON public.skills TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.skills TO authenticated;

GRANT SELECT ON public.services TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.services TO authenticated;

GRANT SELECT ON public.languages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.languages TO authenticated;

GRANT SELECT ON public.candidate_profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_profiles TO authenticated;

-- ── Updated_at trigger on candidate_profiles ────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_candidate_updated_at ON public.candidate_profiles;
CREATE TRIGGER set_candidate_updated_at
  BEFORE UPDATE ON public.candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Account deletion RPC (if missing) ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
