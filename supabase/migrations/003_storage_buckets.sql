-- =============================================
-- 003_storage_buckets.sql
-- =============================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars',                'avatars',                TRUE),
  ('company-logos',          'company-logos',          TRUE),
  ('post-images',            'post-images',            TRUE),
  ('candidate-documents',    'candidate-documents',    FALSE),
  ('verification-documents', 'verification-documents', FALSE);

CREATE POLICY "Avatar upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatar public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Logo upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Logo public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');

CREATE POLICY "Post image upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Post image public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Doc upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'candidate-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Doc read own" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'candidate-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Verification upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Verification admin read" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'verification-documents' AND get_my_role() = 'admin');
