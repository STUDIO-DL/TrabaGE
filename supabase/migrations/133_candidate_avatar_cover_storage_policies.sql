-- =============================================
-- 133_candidate_avatar_cover_storage_policies.sql
-- Fix personal avatar/cover uploads:
-- 1) Allow cover.webp (added in 073) — policies still only allowed avatar.webp
-- 2) Tolerate NULL storage metadata.size (same fix as 080 for company-logos)
-- =============================================

DROP POLICY IF EXISTS "Candidate avatar upload own" ON storage.objects;
CREATE POLICY "Candidate avatar upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-avatars'
    AND name IN (auth.uid()::TEXT || '/avatar.webp', auth.uid()::TEXT || '/cover.webp')
    AND public.is_active_candidate(auth.uid())
    AND coalesce(metadata->>'mimetype', 'image/webp') = 'image/webp'
    AND coalesce((metadata->>'size')::BIGINT, 0) <= 2097152
  );

DROP POLICY IF EXISTS "Candidate avatar update own" ON storage.objects;
CREATE POLICY "Candidate avatar update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'candidate-avatars'
    AND name IN (auth.uid()::TEXT || '/avatar.webp', auth.uid()::TEXT || '/cover.webp')
    AND public.is_active_candidate(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'candidate-avatars'
    AND name IN (auth.uid()::TEXT || '/avatar.webp', auth.uid()::TEXT || '/cover.webp')
    AND public.is_active_candidate(auth.uid())
    AND coalesce(metadata->>'mimetype', 'image/webp') = 'image/webp'
    AND coalesce((metadata->>'size')::BIGINT, 0) <= 2097152
  );

DROP POLICY IF EXISTS "Candidate avatar delete own" ON storage.objects;
CREATE POLICY "Candidate avatar delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'candidate-avatars'
    AND name IN (auth.uid()::TEXT || '/avatar.webp', auth.uid()::TEXT || '/cover.webp')
    AND public.is_active_candidate(auth.uid())
  );

DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Candidate avatar public read" ON storage.objects;
CREATE POLICY "Candidate avatar public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'candidate-avatars');
