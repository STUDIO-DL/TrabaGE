-- =============================================
-- 065_production_security_hardening.sql
-- Production security hardening (no new product features).
--
-- P0: Close over-broad candidate SELECT that leaked OneSignal + PII.
-- P0: Strip onesignal_player_id from client-readable grants.
-- P1: Public directory views; section RLS via SECURITY DEFINER helpers.
-- P1: Drop client role hopping; revoke enqueue spam; legacy storage cleanup.
-- P1: Harden search_candidates as SECURITY DEFINER (safe columns only).
-- =============================================

-- ─── 0. Helpers (bypass RLS safely for visibility checks) ───────────────────
-- is_active_candidate / is_active_company already exist (064). Ensure grants.
GRANT EXECUTE ON FUNCTION public.is_active_candidate(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_company(UUID) TO anon, authenticated, service_role;

-- ─── 1. Candidate base-table SELECT (P0) ────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view active profiles" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Candidates can manage their own profile" ON public.candidate_profiles;
DROP POLICY IF EXISTS "Public read candidates" ON public.candidate_profiles;

DROP POLICY IF EXISTS "Candidates read own profile" ON public.candidate_profiles;
CREATE POLICY "Candidates read own profile"
ON public.candidate_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Companies can read applicant profiles" ON public.candidate_profiles;
CREATE POLICY "Companies can read applicant profiles"
ON public.candidate_profiles FOR SELECT TO authenticated
USING (
  public.is_active_company(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.candidate_id = candidate_profiles.user_id
      AND j.company_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admin read all candidates" ON public.candidate_profiles;
CREATE POLICY "Admin read all candidates"
ON public.candidate_profiles FOR SELECT TO authenticated
USING (public.get_my_role() = 'admin');

-- ─── 2. Company SELECT: keep public row access for job embeds; own + admin ─
DROP POLICY IF EXISTS "Public read companies" ON public.company_profiles;
DROP POLICY IF EXISTS "Public read active companies" ON public.company_profiles;
CREATE POLICY "Public read active companies"
ON public.company_profiles FOR SELECT
USING (coalesce(is_active, true) = true);

DROP POLICY IF EXISTS "Companies read own profile" ON public.company_profiles;
CREATE POLICY "Companies read own profile"
ON public.company_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin read all companies" ON public.company_profiles;
CREATE POLICY "Admin read all companies"
ON public.company_profiles FOR SELECT TO authenticated
USING (public.get_my_role() = 'admin');

-- ─── 3. Column-level lock: OneSignal never readable by clients ──────────────
REVOKE SELECT (onesignal_player_id) ON public.candidate_profiles FROM anon, authenticated;
REVOKE SELECT (onesignal_player_id) ON public.company_profiles FROM anon, authenticated;
-- Owners update via RPC (SECURITY DEFINER) or UPDATE privilege without SELECT.
GRANT UPDATE (onesignal_player_id) ON public.candidate_profiles TO authenticated;
GRANT UPDATE (onesignal_player_id) ON public.company_profiles TO authenticated;

-- ─── 4. Public directory views (no OneSignal / no private internals) ────────
CREATE OR REPLACE VIEW public.candidate_profiles_public
WITH (security_invoker = false) AS
SELECT
  cp.user_id,
  cp.full_name,
  cp.headline,
  cp.about,
  cp.city,
  cp.province,
  cp.country,
  cp.avatar_path,
  cp.years_experience,
  cp.contact_email,
  cp.contact_whatsapp,
  cp.setup_complete,
  cp.is_active,
  cp.created_at,
  cp.updated_at
FROM public.candidate_profiles cp
WHERE coalesce(cp.is_active, true) = true;

CREATE OR REPLACE VIEW public.company_profiles_public
WITH (security_invoker = false) AS
SELECT
  co.user_id,
  co.company_name,
  co.company_type,
  co.sector,
  co.description,
  co.city,
  co.country,
  co.address,
  co.website,
  co.founded_year,
  co.company_size,
  co.logo_path,
  co.cover_path,
  co.contact_email,
  co.contact_phone,
  co.contact_whatsapp,
  co.social_links,
  co.is_verified,
  co.verification_status,
  co.verified_status,
  co.setup_complete,
  co.is_active,
  co.created_at,
  co.updated_at
FROM public.company_profiles co
WHERE coalesce(co.is_active, true) = true;

REVOKE ALL ON public.candidate_profiles_public FROM PUBLIC;
REVOKE ALL ON public.company_profiles_public FROM PUBLIC;
GRANT SELECT ON public.candidate_profiles_public TO anon, authenticated, service_role;
GRANT SELECT ON public.company_profiles_public TO anon, authenticated, service_role;

-- ─── 5. Profile section RLS: use SECURITY DEFINER helper (survives base lock) ─
DROP POLICY IF EXISTS "Authenticated users can view education of active profiles" ON public.education;
DROP POLICY IF EXISTS "Public read education of active profiles" ON public.education;
CREATE POLICY "Public read education of active profiles"
ON public.education FOR SELECT TO anon, authenticated
USING (public.is_active_candidate(user_id));

DROP POLICY IF EXISTS "Authenticated users can view experience of active profiles" ON public.experience;
DROP POLICY IF EXISTS "Public read experience of active profiles" ON public.experience;
CREATE POLICY "Public read experience of active profiles"
ON public.experience FOR SELECT TO anon, authenticated
USING (public.is_active_candidate(user_id));

DROP POLICY IF EXISTS "Authenticated users can view certifications of active profiles" ON public.certifications;
DROP POLICY IF EXISTS "Public read certifications of active profiles" ON public.certifications;
CREATE POLICY "Public read certifications of active profiles"
ON public.certifications FOR SELECT TO anon, authenticated
USING (public.is_active_candidate(user_id));

DROP POLICY IF EXISTS "Authenticated users can view skills of active profiles" ON public.skills;
DROP POLICY IF EXISTS "Public read skills of active profiles" ON public.skills;
CREATE POLICY "Public read skills of active profiles"
ON public.skills FOR SELECT TO anon, authenticated
USING (public.is_active_candidate(user_id));

DROP POLICY IF EXISTS "Authenticated users can view services of active profiles" ON public.services;
DROP POLICY IF EXISTS "Public read services of active profiles" ON public.services;
CREATE POLICY "Public read services of active profiles"
ON public.services FOR SELECT TO anon, authenticated
USING (public.is_active_candidate(user_id));

DROP POLICY IF EXISTS "Authenticated users can view languages of active profiles" ON public.languages;
DROP POLICY IF EXISTS "Public read languages of active profiles" ON public.languages;
CREATE POLICY "Public read languages of active profiles"
ON public.languages FOR SELECT TO anon, authenticated
USING (public.is_active_candidate(user_id));

DROP POLICY IF EXISTS "Authenticated users can view candidate links of active profiles" ON public.candidate_links;
DROP POLICY IF EXISTS "Public read candidate links of active profiles" ON public.candidate_links;
CREATE POLICY "Public read candidate links of active profiles"
ON public.candidate_links FOR SELECT TO anon, authenticated
USING (public.is_active_candidate(user_id));

GRANT SELECT ON public.education TO anon, authenticated;
GRANT SELECT ON public.experience TO anon, authenticated;
GRANT SELECT ON public.certifications TO anon, authenticated;
GRANT SELECT ON public.skills TO anon, authenticated;
GRANT SELECT ON public.services TO anon, authenticated;
GRANT SELECT ON public.languages TO anon, authenticated;
GRANT SELECT ON public.candidate_links TO anon, authenticated;

-- ─── 6. Block client role hopping ───────────────────────────────────────────
DROP POLICY IF EXISTS "Own role update" ON public.user_roles;

-- ─── 7. Legacy storage FOR ALL / duplicate policies ─────────────────────────
DROP POLICY IF EXISTS "Allow owner to manage their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner to manage their own CV" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Company logo manage own" ON storage.objects;
DROP POLICY IF EXISTS "Company post image manage own" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload own" ON storage.objects;
DROP POLICY IF EXISTS "Doc upload own" ON storage.objects;
DROP POLICY IF EXISTS "Doc read own" ON storage.objects;
DROP POLICY IF EXISTS "Verification upload" ON storage.objects;
DROP POLICY IF EXISTS "Verification admin read" ON storage.objects;
DROP POLICY IF EXISTS "Company read applicant CVs" ON storage.objects;
DROP POLICY IF EXISTS "Company read applicant CVs legacy" ON storage.objects;

UPDATE storage.buckets
SET public = false,
    file_size_limit = 1,
    allowed_mime_types = ARRAY['application/octet-stream']
WHERE id IN ('avatars', 'candidate-documents', 'verification-documents');

-- ─── 8. RPC: enqueue only for service_role / triggers ───────────────────────
CREATE OR REPLACE FUNCTION public.enqueue_recommendation_recalc(
  p_subject_type TEXT,
  p_subject_id UUID,
  p_reason TEXT,
  p_source_table TEXT DEFAULT NULL,
  p_source_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dedup_key TEXT;
BEGIN
  v_dedup_key := concat_ws(
    ':',
    p_subject_type,
    p_subject_id::TEXT,
    p_reason,
    coalesce(p_source_table, ''),
    coalesce(p_source_id::TEXT, '')
  );

  INSERT INTO public.recommendation_recalc_events (
    subject_type,
    subject_id,
    reason,
    source_table,
    source_id,
    dedup_key
  )
  VALUES (
    p_subject_type,
    p_subject_id,
    p_reason,
    p_source_table,
    p_source_id,
    v_dedup_key
  )
  ON CONFLICT (dedup_key) DO UPDATE
  SET created_at = NOW(),
      processed_at = NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_recommendation_recalc(TEXT, UUID, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_recommendation_recalc(TEXT, UUID, TEXT, TEXT, UUID)
  TO service_role;

-- ─── 9. OneSignal setter (rate-limited, no client SELECT of player id) ──────
CREATE OR REPLACE FUNCTION public.set_onesignal_player_id(p_player_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM public.assert_rate_limit(v_uid, 'onesignal:update', 20, interval '1 hour');

  v_role := public.get_my_role();

  IF public.is_personal_role(v_role) THEN
    UPDATE public.candidate_profiles
    SET onesignal_player_id = NULLIF(trim(p_player_id), '')
    WHERE user_id = v_uid;
  ELSIF public.is_employer_role(v_role) THEN
    UPDATE public.company_profiles
    SET onesignal_player_id = NULLIF(trim(p_player_id), '')
    WHERE user_id = v_uid;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_onesignal_player_id(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_onesignal_player_id(TEXT) TO authenticated;

-- ─── 10. search_candidates: SECURITY DEFINER + safe columns only ────────────
CREATE OR REPLACE FUNCTION public.search_candidates(keyword TEXT, p_limit INT DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  headline TEXT,
  city TEXT,
  avatar_path TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  fts_query TSQUERY;
  v_limit INT := LEAST(GREATEST(coalesce(p_limit, 20), 1), 50);
BEGIN
  IF keyword IS NULL OR char_length(trim(keyword)) < 2 THEN
    RETURN;
  END IF;

  BEGIN
    fts_query := websearch_to_tsquery('spanish', keyword);
  EXCEPTION
    WHEN OTHERS THEN
      fts_query := NULL;
  END;

  RETURN QUERY
  SELECT
    cp.user_id,
    cp.full_name,
    cp.headline,
    cp.city,
    cp.avatar_path
  FROM public.candidate_profiles AS cp
  WHERE coalesce(cp.is_active, true) = true
    AND (
      (fts_query IS NOT NULL AND cp.fts @@ fts_query)
      OR cp.full_name ILIKE ('%' || keyword || '%')
      OR cp.headline ILIKE ('%' || keyword || '%')
      OR cp.city ILIKE ('%' || keyword || '%')
    )
  ORDER BY
    CASE WHEN fts_query IS NOT NULL THEN ts_rank(cp.fts, fts_query) ELSE 0 END DESC,
    cp.updated_at DESC NULLS LAST
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.search_candidates(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_candidates(TEXT, INT) TO anon, authenticated, service_role;

-- ─── 11. Feed self-guard helper (admin may inspect) ─────────────────────────
CREATE OR REPLACE FUNCTION public.require_feed_self(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  IF p_user_id IS NOT NULL AND auth.uid() = p_user_id THEN
    RETURN true;
  END IF;
  RETURN public.get_my_role() = 'admin';
END;
$$;

REVOKE ALL ON FUNCTION public.require_feed_self(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.require_feed_self(UUID) TO authenticated, service_role;

-- ─── 12. Platform settings: keep admin RLS, no accidental open UPDATE ───────
DROP POLICY IF EXISTS "Admin update platform settings" ON public.platform_settings;
CREATE POLICY "Admin update platform settings" ON public.platform_settings
FOR UPDATE TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

-- ─── 13. Harden feed RPC search_path ────────────────────────────────────────
ALTER FUNCTION public.get_personalized_feed(UUID, TEXT, INT, INT)
  SET search_path = public, pg_temp;

-- ─── 14. Reload PostgREST schema cache ──────────────────────────────────────
NOTIFY pgrst, 'reload schema';
