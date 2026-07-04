-- =============================================
-- 040_company_flow_completion.sql
-- Company flow stability: profile fields, jobs, posts, followers, storage/RLS.
-- =============================================

-- Company profile fields required by the production company flow.
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Guinea Ecuatorial',
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS founded_year INTEGER,
  ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS company_profiles_city_idx
  ON public.company_profiles (city);

CREATE INDEX IF NOT EXISTS company_profiles_sector_idx
  ON public.company_profiles (sector);

CREATE OR REPLACE FUNCTION public.update_company_profiles_fts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.fts :=
    setweight(to_tsvector('spanish', coalesce(NEW.company_name, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.sector, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.company_type, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(NEW.city, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.country, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(NEW.address, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$;

UPDATE public.company_profiles SET user_id = user_id;

-- Companies can edit their business profile, but not self-verify or change
-- moderation/admin fields from the client.
CREATE OR REPLACE FUNCTION public.protect_company_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.user_id AND current_user = 'authenticated' THEN
    NEW.is_verified := OLD.is_verified;
    NEW.verification_status := OLD.verification_status;
    NEW.verified_status := OLD.verified_status;
    NEW.verified_at := OLD.verified_at;
    NEW.verified_by := OLD.verified_by;
    NEW.is_active := OLD.is_active;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_company_admin_fields_trigger ON public.company_profiles;
CREATE TRIGGER protect_company_admin_fields_trigger
  BEFORE UPDATE ON public.company_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_company_admin_fields();

-- Jobs dashboard and application management queries.
CREATE INDEX IF NOT EXISTS jobs_company_status_created_idx
  ON public.jobs (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS applications_job_status_applied_idx
  ON public.applications (job_id, status, applied_at DESC);

DROP POLICY IF EXISTS "Companies can read applicant profiles" ON public.candidate_profiles;
CREATE POLICY "Companies can read applicant profiles"
ON public.candidate_profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j
      ON j.id = a.job_id
    WHERE a.candidate_id = candidate_profiles.user_id
      AND j.company_id = auth.uid()
  )
);

-- Posts can be edited by their owner and carry updated_at for UI freshness.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS set_posts_updated_at ON public.posts;
CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP POLICY IF EXISTS "Own update posts" ON public.posts;
CREATE POLICY "Own update posts"
ON public.posts FOR UPDATE TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- Company users need full lifecycle access to their own jobs, including drafts.
DROP POLICY IF EXISTS "Companies can manage their own jobs" ON public.jobs;
CREATE POLICY "Companies can manage their own jobs"
ON public.jobs FOR ALL TO authenticated
USING (company_id = auth.uid())
WITH CHECK (company_id = auth.uid());

DROP POLICY IF EXISTS "Companies can read own applications" ON public.applications;
CREATE POLICY "Companies can read own applications"
ON public.applications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = applications.job_id
      AND j.company_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Companies can update own application statuses" ON public.applications;
CREATE POLICY "Companies can update own application statuses"
ON public.applications FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = applications.job_id
      AND j.company_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = applications.job_id
      AND j.company_id = auth.uid()
  )
);

-- Guard against ambiguous follower SQL and keep company follower lists private to owner/admin.
CREATE OR REPLACE FUNCTION public.get_followers(
  p_target_type TEXT,
  p_target_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  headline TEXT,
  avatar_path TEXT,
  followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    auth.uid() = p_target_id
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    cp.user_id,
    cp.full_name,
    cp.headline,
    cp.avatar_path,
    f.created_at AS followed_at
  FROM public.follows f
  JOIN public.candidate_profiles cp
    ON cp.user_id = f.user_id
  WHERE f.target_type = p_target_type
    AND f.target_id = p_target_id
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_followers(TEXT, UUID, INT, INT) TO authenticated;

-- Notify the company when a candidate follows it.
CREATE OR REPLACE FUNCTION public.notify_company_new_follower()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_name TEXT;
BEGIN
  IF NEW.target_type <> 'company' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(cp.full_name, 'Un candidato')
  INTO v_candidate_name
  FROM public.candidate_profiles cp
  WHERE cp.user_id = NEW.user_id;

  INSERT INTO public.notifications (recipient_id, type, title, body, metadata)
  VALUES (
    NEW.target_id,
    'new_follower',
    'Nuevo seguidor',
    v_candidate_name || ' empezó a seguir tu empresa.',
    jsonb_build_object(
      'follower_id', NEW.user_id,
      'target_type', NEW.target_type,
      'link', '/company/profile'
    )
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_company_follow_notify ON public.follows;
CREATE TRIGGER on_company_follow_notify
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_company_new_follower();

-- Storage: company logo/cover paths live under company-logos/<company-id>/...
DROP POLICY IF EXISTS "Company logo public read" ON storage.objects;
CREATE POLICY "Company logo public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "Company logo manage own" ON storage.objects;
CREATE POLICY "Company logo manage own"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Company post image manage own" ON storage.objects;
CREATE POLICY "Company post image manage own"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT, UPDATE ON public.applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
