-- =============================================
-- 001_initial_schema.sql
-- =============================================

CREATE TABLE public.user_roles (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL CHECK (role IN ('candidate', 'company', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.candidate_profiles (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  headline        TEXT,
  about           TEXT,
  avatar_url      TEXT,
  city            TEXT,
  cv_url          TEXT,
  cv_name         TEXT,
  cover_letter_url TEXT,
  cover_letter_name TEXT,
  setup_complete  BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.company_profiles (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name    TEXT NOT NULL,
  sector          TEXT,
  description     TEXT,
  logo_url        TEXT,
  city            TEXT,
  verified_status TEXT DEFAULT 'unverified'
                  CHECK (verified_status IN ('unverified','pending','verified','rejected')),
  setup_complete  BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.education (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  institution   TEXT NOT NULL,
  program       TEXT,
  grade         TEXT,
  start_date    DATE,
  end_date      DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.experience (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  company       TEXT NOT NULL,
  position      TEXT NOT NULL,
  description   TEXT,
  start_date    DATE,
  end_date      DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.certifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  issuer        TEXT,
  issued_date   DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.skills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.languages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID NOT NULL REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  language      TEXT NOT NULL,
  level         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES company_profiles(user_id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  requirements  TEXT,
  salary        TEXT,
  city          TEXT,
  job_type      TEXT CHECK (job_type IN ('full-time','part-time','freelance','internship')),
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','paused','closed')),
  custom_questions JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    UUID NOT NULL REFERENCES candidate_profiles(user_id) ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  cv_url          TEXT NOT NULL,
  cv_name         TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  additional_notes TEXT,
  custom_answers  JSONB,
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending','viewed','contacted','rejected')),
  applied_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (candidate_id, job_id)
);

CREATE TABLE public.posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_type   TEXT NOT NULL CHECK (author_type IN ('candidate','company')),
  content       TEXT NOT NULL,
  image_url     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  metadata      JSONB,
  read          BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.verification_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES company_profiles(user_id) ON DELETE CASCADE,
  document_url  TEXT NOT NULL,
  status        TEXT DEFAULT 'pending'
                CHECK (status IN ('pending','verified','rejected')),
  notes         TEXT,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_candidate_updated_at
  BEFORE UPDATE ON candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_company_updated_at
  BEFORE UPDATE ON company_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_job_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
