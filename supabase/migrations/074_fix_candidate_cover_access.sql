-- =============================================
-- 074_fix_candidate_cover_access.sql
-- Make candidate covers writable and visible on public profiles
-- =============================================

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
  cp.sector,
  cp.avatar_path,
  cp.years_experience,
  cp.show_education_in_intro,
  cp.intro_education_id,
  cp.contact_email,
  cp.contact_whatsapp,
  cp.setup_complete,
  cp.is_active,
  cp.created_at,
  cp.updated_at,
  cp.cover_path
FROM public.candidate_profiles cp
WHERE coalesce(cp.is_active, true) = true;

REVOKE ALL ON public.candidate_profiles_public FROM PUBLIC;
GRANT SELECT ON public.candidate_profiles_public TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Candidate cover upload own" ON storage.objects;
CREATE POLICY "Candidate cover upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-avatars'
    AND name = auth.uid()::TEXT || '/cover.webp'
    AND public.is_active_candidate(auth.uid())
    AND metadata->>'mimetype' = 'image/webp'
    AND (metadata->>'size')::BIGINT <= 2097152
  );

DROP POLICY IF EXISTS "Candidate cover update own" ON storage.objects;
CREATE POLICY "Candidate cover update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'candidate-avatars'
    AND name = auth.uid()::TEXT || '/cover.webp'
    AND public.is_active_candidate(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'candidate-avatars'
    AND name = auth.uid()::TEXT || '/cover.webp'
    AND public.is_active_candidate(auth.uid())
    AND metadata->>'mimetype' = 'image/webp'
    AND (metadata->>'size')::BIGINT <= 2097152
  );

DROP POLICY IF EXISTS "Candidate cover delete own" ON storage.objects;
CREATE POLICY "Candidate cover delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'candidate-avatars'
    AND name = auth.uid()::TEXT || '/cover.webp'
    AND public.is_active_candidate(auth.uid())
  );
