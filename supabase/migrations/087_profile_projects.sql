-- =============================================
-- 087_profile_projects.sql
-- Profile projects section (all account types) + storage
-- =============================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_created
  ON public.projects (user_id, created_at DESC);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_title_length_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_title_length_check
    CHECK (char_length(trim(title)) >= 1 AND char_length(title) <= 120) NOT VALID;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_description_length_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_description_length_check
    CHECK (char_length(trim(description)) >= 1 AND char_length(description) <= 2000) NOT VALID;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_image_path_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_image_path_check
    CHECK (char_length(trim(image_path)) >= 1) NOT VALID;

CREATE OR REPLACE FUNCTION public.enforce_projects_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.projects
    WHERE user_id = NEW.user_id
  ) >= 3 THEN
    RAISE EXCEPTION 'projects_limit_exceeded'
      USING ERRCODE = 'check_violation',
            MESSAGE = 'Maximum of 3 projects per profile';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_projects_limit ON public.projects;
CREATE TRIGGER trg_enforce_projects_limit
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_projects_limit();

CREATE OR REPLACE FUNCTION public.touch_projects_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_projects_updated_at ON public.projects;
CREATE TRIGGER trg_touch_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_projects_updated_at();

DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projects;
CREATE POLICY "Users can manage their own projects"
ON public.projects FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can view projects of active profiles" ON public.projects;
CREATE POLICY "Authenticated users can view projects of active profiles"
ON public.projects FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.candidate_profiles cp
    WHERE cp.user_id = projects.user_id
      AND coalesce(cp.is_active, true) = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.company_profiles cp
    WHERE cp.user_id = projects.user_id
      AND coalesce(cp.is_active, true) = true
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-projects', 'profile-projects', TRUE)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Profile project image upload own" ON storage.objects;
CREATE POLICY "Profile project image upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-projects'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND (storage.foldername(name))[2] = 'projects'
    AND lower(name) LIKE '%.webp'
    AND (
      public.is_active_candidate(auth.uid())
      OR public.is_active_company(auth.uid())
    )
    AND coalesce(metadata->>'mimetype', 'image/webp') = 'image/webp'
    AND coalesce((metadata->>'size')::BIGINT, 0) <= 3145728
  );

DROP POLICY IF EXISTS "Profile project image update own" ON storage.objects;
CREATE POLICY "Profile project image update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-projects'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND (
      public.is_active_candidate(auth.uid())
      OR public.is_active_company(auth.uid())
    )
  )
  WITH CHECK (
    bucket_id = 'profile-projects'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND (storage.foldername(name))[2] = 'projects'
    AND lower(name) LIKE '%.webp'
    AND (
      public.is_active_candidate(auth.uid())
      OR public.is_active_company(auth.uid())
    )
    AND coalesce(metadata->>'mimetype', 'image/webp') = 'image/webp'
    AND coalesce((metadata->>'size')::BIGINT, 0) <= 3145728
  );

DROP POLICY IF EXISTS "Profile project image read public" ON storage.objects;
CREATE POLICY "Profile project image read public" ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'profile-projects');

DROP POLICY IF EXISTS "Profile project image delete own" ON storage.objects;
CREATE POLICY "Profile project image delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-projects'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
