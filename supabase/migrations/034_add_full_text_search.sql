-- =============================================
-- 034_add_full_text_search.sql
-- Add full-text search capabilities to jobs, candidates, and companies.
-- =============================================

-- 1. Add tsvector columns to store searchable text
ALTER TABLE public.candidate_profiles ADD COLUMN IF NOT EXISTS fts tsvector;
ALTER TABLE public.company_profiles ADD COLUMN IF NOT EXISTS fts tsvector;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS fts tsvector;

-- 2. Create functions to update the tsvector columns
-- Using 'spanish' configuration for better stemming and stop words for Spanish.

-- For company_profiles
CREATE OR REPLACE FUNCTION public.update_company_profiles_fts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.fts :=
    setweight(to_tsvector('spanish', coalesce(NEW.company_name, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.sector, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.company_type, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(NEW.city, '')), 'B');
  RETURN NEW;
END;
$$;

-- For jobs
CREATE OR REPLACE FUNCTION public.update_jobs_fts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.fts :=
    setweight(to_tsvector('spanish', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.requirements, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.city, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(NEW.job_type, '')), 'C');
  RETURN NEW;
END;
$$;

-- For candidate_profiles.
-- Related subtables are added to the final version after migration 036 standardizes
-- their FK column from candidate_id to user_id.
CREATE OR REPLACE FUNCTION public.update_candidate_profiles_fts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.fts :=
    setweight(to_tsvector('spanish', coalesce(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.headline, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.about, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(NEW.city, '')), 'B');
  RETURN NEW;
END;
$$;

-- 3. Create triggers to automatically call the update functions

DROP TRIGGER IF EXISTS tsvector_update ON public.company_profiles;
CREATE TRIGGER tsvector_update
BEFORE INSERT OR UPDATE ON public.company_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_company_profiles_fts();

DROP TRIGGER IF EXISTS tsvector_update ON public.jobs;
CREATE TRIGGER tsvector_update
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.update_jobs_fts();

DROP TRIGGER IF EXISTS tsvector_update ON public.candidate_profiles;
CREATE TRIGGER tsvector_update
BEFORE INSERT OR UPDATE ON public.candidate_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_candidate_profiles_fts();

-- 4. Create GIN indexes for fast full-text search

CREATE INDEX IF NOT EXISTS candidate_profiles_fts_idx ON public.candidate_profiles USING gin(fts);
CREATE INDEX IF NOT EXISTS company_profiles_fts_idx ON public.company_profiles USING gin(fts);
CREATE INDEX IF NOT EXISTS jobs_fts_idx ON public.jobs USING gin(fts);

-- 5. Backfill existing data
-- This ensures that current records are indexed immediately after the migration.
-- By updating a row, we fire the trigger that populates the `fts` column.
-- Note: This can be slow on very large tables.
UPDATE public.jobs SET id = id;
UPDATE public.company_profiles SET user_id = user_id;
UPDATE public.candidate_profiles SET user_id = user_id;