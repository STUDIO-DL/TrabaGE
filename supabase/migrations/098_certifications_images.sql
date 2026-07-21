-- =============================================
-- 098_certifications_images.sql
-- Certificate image attachments + optional metadata
-- =============================================

ALTER TABLE public.certifications
  ADD COLUMN IF NOT EXISTS expires_at DATE,
  ADD COLUMN IF NOT EXISTS credential_id TEXT,
  ADD COLUMN IF NOT EXISTS image_path TEXT;

ALTER TABLE public.certifications
  DROP CONSTRAINT IF EXISTS certifications_credential_id_length_check;
ALTER TABLE public.certifications
  ADD CONSTRAINT certifications_credential_id_length_check
    CHECK (credential_id IS NULL OR char_length(credential_id) <= 120) NOT VALID;

ALTER TABLE public.certifications
  DROP CONSTRAINT IF EXISTS certifications_image_path_length_check;
ALTER TABLE public.certifications
  ADD CONSTRAINT certifications_image_path_length_check
    CHECK (image_path IS NULL OR char_length(trim(image_path)) >= 1) NOT VALID;

INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-certifications', 'candidate-certifications', TRUE)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Candidate certification image upload own" ON storage.objects;
CREATE POLICY "Candidate certification image upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-certifications'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND (storage.foldername(name))[2] = 'certifications'
    AND lower(name) LIKE '%.webp'
    AND public.is_active_candidate(auth.uid())
    AND coalesce(metadata->>'mimetype', 'image/webp') = 'image/webp'
    AND coalesce((metadata->>'size')::BIGINT, 0) <= 3145728
  );

DROP POLICY IF EXISTS "Candidate certification image update own" ON storage.objects;
CREATE POLICY "Candidate certification image update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'candidate-certifications'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND public.is_active_candidate(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'candidate-certifications'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND (storage.foldername(name))[2] = 'certifications'
    AND lower(name) LIKE '%.webp'
    AND public.is_active_candidate(auth.uid())
    AND coalesce(metadata->>'mimetype', 'image/webp') = 'image/webp'
    AND coalesce((metadata->>'size')::BIGINT, 0) <= 3145728
  );

DROP POLICY IF EXISTS "Candidate certification image read public" ON storage.objects;
CREATE POLICY "Candidate certification image read public" ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'candidate-certifications');

DROP POLICY IF EXISTS "Candidate certification image delete own" ON storage.objects;
CREATE POLICY "Candidate certification image delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'candidate-certifications'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
