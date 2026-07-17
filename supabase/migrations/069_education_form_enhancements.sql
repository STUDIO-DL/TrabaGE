-- =============================================
-- 068_education_form_enhancements.sql
-- Extended education profile fields + private storage for attachments
-- =============================================

ALTER TABLE public.education
  ADD COLUMN IF NOT EXISTS activities TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS media_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.education
  DROP CONSTRAINT IF EXISTS education_activities_length_check;
ALTER TABLE public.education
  ADD CONSTRAINT education_activities_length_check
    CHECK (activities IS NULL OR char_length(activities) <= 500) NOT VALID;

ALTER TABLE public.education
  DROP CONSTRAINT IF EXISTS education_description_length_check;
ALTER TABLE public.education
  ADD CONSTRAINT education_description_length_check
    CHECK (description IS NULL OR char_length(description) <= 1000) NOT VALID;

ALTER TABLE public.education
  DROP CONSTRAINT IF EXISTS education_skills_count_check;
ALTER TABLE public.education
  ADD CONSTRAINT education_skills_count_check
    CHECK (coalesce(array_length(skills, 1), 0) <= 5) NOT VALID;

ALTER TABLE public.education
  DROP CONSTRAINT IF EXISTS education_media_files_count_check;
ALTER TABLE public.education
  ADD CONSTRAINT education_media_files_count_check
    CHECK (jsonb_array_length(media_files) <= 5) NOT VALID;

INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-education-files', 'candidate-education-files', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Candidate education files upload own" ON storage.objects;
CREATE POLICY "Candidate education files upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-education-files'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND (storage.foldername(name))[2] = 'education'
    AND (metadata->>'size')::BIGINT <= 5242880
    AND metadata->>'mimetype' IN (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg'
    )
  );

DROP POLICY IF EXISTS "Candidate education files update own" ON storage.objects;
CREATE POLICY "Candidate education files update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'candidate-education-files'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'candidate-education-files'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND (storage.foldername(name))[2] = 'education'
    AND (metadata->>'size')::BIGINT <= 5242880
    AND metadata->>'mimetype' IN (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg'
    )
  );

DROP POLICY IF EXISTS "Candidate education files read own" ON storage.objects;
CREATE POLICY "Candidate education files read own" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'candidate-education-files'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Candidate education files delete own" ON storage.objects;
CREATE POLICY "Candidate education files delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'candidate-education-files'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
