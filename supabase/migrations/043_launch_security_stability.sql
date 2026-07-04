-- =============================================
-- 043_launch_security_stability.sql
-- Launch hardening: guarded notification creation and remaining legacy cleanup.
-- =============================================

-- Remove legacy permissive policy names that can survive older migrations.
DROP POLICY IF EXISTS "Public read certs" ON public.certifications;
DROP POLICY IF EXISTS "Public read companies" ON public.company_profiles;
DROP POLICY IF EXISTS "Public read active companies" ON public.company_profiles;
CREATE POLICY "Public read active companies"
ON public.company_profiles FOR SELECT
USING (coalesce(is_active, true) = true);

DROP POLICY IF EXISTS "Candidate reapply own withdrawn apps" ON public.applications;
CREATE POLICY "Candidate reapply own withdrawn apps"
ON public.applications FOR UPDATE TO authenticated
USING (candidate_id = auth.uid() AND status = 'withdrawn')
WITH CHECK (candidate_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Own role update" ON public.user_roles;
CREATE POLICY "Own role update" ON public.user_roles
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND role <> 'admin')
WITH CHECK (user_id = auth.uid() AND role IN ('candidate', 'company'));

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('candidate-cvs', 'candidate-cvs', FALSE),
  ('candidate-avatars', 'candidate-avatars', TRUE),
  ('company-logos', 'company-logos', TRUE),
  ('post-images', 'post-images', TRUE),
  ('company-verifications', 'company-verifications', FALSE)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Company logo update own" ON storage.objects;
CREATE POLICY "Company logo update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Post image update own" ON storage.objects;
CREATE POLICY "Post image update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dedup_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedup_key_unique_idx
  ON public.notifications (dedup_key)
  WHERE dedup_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.protect_company_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND get_my_role() <> 'admin' THEN
    NEW.is_active := OLD.is_active;
    NEW.is_verified := OLD.is_verified;
    NEW.verification_status := OLD.verification_status;
    NEW.verified_status := OLD.verified_status;
    NEW.verified_at := OLD.verified_at;
    NEW.verified_by := OLD.verified_by;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_company_admin_fields_trigger ON public.company_profiles;
CREATE TRIGGER protect_company_admin_fields_trigger
  BEFORE UPDATE ON public.company_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_company_admin_fields();

CREATE OR REPLACE FUNCTION public.protect_candidate_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND get_my_role() <> 'admin' THEN
    NEW.is_active := OLD.is_active;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_candidate_admin_fields_trigger ON public.candidate_profiles;
CREATE TRIGGER protect_candidate_admin_fields_trigger
  BEFORE UPDATE ON public.candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_candidate_admin_fields();

CREATE OR REPLACE FUNCTION public.get_user_followers(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_path TEXT,
  headline TEXT,
  followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    cp.user_id,
    cp.full_name,
    cp.avatar_path,
    cp.headline,
    f.created_at AS followed_at
  FROM public.follows f
  JOIN public.candidate_profiles cp ON cp.user_id = f.user_id
  WHERE f.target_id = p_user_id
    AND f.target_type = 'company'
  ORDER BY f.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_discovery(
  p_query TEXT,
  p_limit INT DEFAULT 8
)
RETURNS TABLE (
  result_type TEXT,
  result_id UUID,
  title TEXT,
  subtitle TEXT,
  path TEXT,
  avatar_path TEXT,
  rank REAL,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query TEXT := trim(coalesce(p_query, ''));
  v_fts tsquery;
BEGIN
  IF v_query = '' THEN
    RETURN;
  END IF;

  v_fts := websearch_to_tsquery('spanish', v_query);

  RETURN QUERY
  WITH ranked AS (
    SELECT
      'job'::TEXT AS result_type,
      j.id AS result_id,
      j.title,
      concat_ws(' • ', co.company_name, j.city) AS subtitle,
      ('/jobs/' || j.id::TEXT) AS path,
      co.logo_path AS avatar_path,
      (ts_rank(j.fts, v_fts) + 0.30)::REAL AS rank,
      j.created_at
    FROM public.jobs j
    JOIN public.company_profiles co ON co.user_id = j.company_id
    WHERE j.status = 'active'
      AND coalesce(j.admin_hidden, false) = false
      AND coalesce(co.is_active, true) = true
      AND j.fts @@ v_fts

    UNION ALL

    SELECT
      'company'::TEXT AS result_type,
      co.user_id AS result_id,
      co.company_name AS title,
      concat_ws(' • ', co.sector, co.city) AS subtitle,
      ('/companies/' || co.user_id::TEXT) AS path,
      co.logo_path AS avatar_path,
      (ts_rank(co.fts, v_fts) + 0.20)::REAL AS rank,
      co.created_at
    FROM public.company_profiles co
    WHERE coalesce(co.is_active, true) = true
      AND co.fts @@ v_fts

    UNION ALL

    SELECT
      'candidate'::TEXT AS result_type,
      cp.user_id AS result_id,
      cp.full_name AS title,
      concat_ws(' • ', cp.headline, cp.city) AS subtitle,
      ('/profile/' || cp.user_id::TEXT) AS path,
      cp.avatar_path AS avatar_path,
      (ts_rank(cp.fts, v_fts) + 0.10)::REAL AS rank,
      cp.created_at
    FROM public.candidate_profiles cp
    WHERE coalesce(cp.is_active, true) = true
      AND cp.fts @@ v_fts

    UNION ALL

    SELECT
      'post'::TEXT AS result_type,
      p.id AS result_id,
      left(p.content, 90) AS title,
      CASE
        WHEN p.author_type = 'company' THEN 'Publicacion de empresa'
        ELSE 'Publicacion de candidato'
      END AS subtitle,
      ('/feed/post/' || p.id::TEXT) AS path,
      NULL::TEXT AS avatar_path,
      ts_rank(p.fts, v_fts)::REAL AS rank,
      p.created_at
    FROM public.posts p
    WHERE p.fts @@ v_fts
      AND coalesce(p.is_hidden, false) = false
  )
  SELECT *
  FROM ranked
  WHERE title IS NOT NULL AND trim(title) <> ''
  ORDER BY rank DESC, created_at DESC
  LIMIT p_limit * 4;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification public.notifications;
  v_application_id UUID;
  v_job_id UUID;
  v_dedup_key TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_application_id := NULLIF(p_metadata->>'application_id', '')::UUID;
  v_job_id := NULLIF(p_metadata->>'job_id', '')::UUID;

  IF p_recipient_id = auth.uid() THEN
    -- Users may create self-notifications used by verification acknowledgements.
    NULL;
  ELSIF p_type = 'new_application' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.candidate_id = auth.uid()
        AND a.job_id = v_job_id
        AND j.company_id = p_recipient_id
    ) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSIF p_type IN ('application_viewed', 'application_contacted', 'application_accepted', 'application_rejected') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.id = v_application_id
        AND a.candidate_id = p_recipient_id
        AND j.company_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSIF p_type IN ('verification_approved', 'verification_rejected') THEN
    IF get_my_role() <> 'admin' THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_dedup_key := md5(concat_ws(':', p_recipient_id::TEXT, p_type, coalesce(v_application_id::TEXT, ''), coalesce(v_job_id::TEXT, ''), coalesce(p_title, '')));

  INSERT INTO public.notifications (recipient_id, type, title, body, metadata, dedup_key)
  VALUES (p_recipient_id, p_type, p_title, p_body, p_metadata, v_dedup_key)
  ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO UPDATE
  SET title = EXCLUDED.title,
      body = EXCLUDED.body,
      metadata = EXCLUDED.metadata
  RETURNING * INTO v_notification;

  RETURN v_notification;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.notify_job_recommendations(UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_job_match(UUID, UUID, SMALLINT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_job_matches(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.track_recommendation_event(UUID, UUID, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.enqueue_recommendation_recalc(TEXT, UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_welcome_email_send(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_welcome_email_claim(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_discovery(TEXT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_followers(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_job_recommendations(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_job_match(UUID, UUID, SMALLINT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_job_matches(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_recommendation_event(UUID, UUID, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_recommendation_recalc(TEXT, UUID, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_welcome_email_send(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_welcome_email_claim(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_discovery(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_followers(UUID) TO authenticated;
