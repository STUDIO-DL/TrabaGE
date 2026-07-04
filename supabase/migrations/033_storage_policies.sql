-- =============================================
-- 033_storage_policies.sql
-- Harden RLS policies for storage buckets related to candidates.
-- =============================================

-- Bucket: candidate-avatars
-- Avatars are public. Anyone can read.
-- Users can only manage files in their own folder (named after their user_id).
DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
CREATE POLICY "Allow public read access to avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'candidate-avatars');

DROP POLICY IF EXISTS "Allow owner to manage their own avatar" ON storage.objects;
CREATE POLICY "Allow owner to manage their own avatar"
ON storage.objects FOR ALL
USING (bucket_id = 'candidate-avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid)
WITH CHECK (bucket_id = 'candidate-avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid);

-- Bucket: candidate-cvs
-- CVs are private. Users can only manage their own CV.
DROP POLICY IF EXISTS "Allow owner to manage their own CV" ON storage.objects;
CREATE POLICY "Allow owner to manage their own CV"
ON storage.objects FOR ALL
USING (bucket_id = 'candidate-cvs' AND auth.uid() = (storage.foldername(name))[1]::uuid)
WITH CHECK (bucket_id = 'candidate-cvs' AND auth.uid() = (storage.foldername(name))[1]::uuid);