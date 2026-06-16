-- =============================================
-- 017_mvp_rls_grants_storage_fixes.sql
-- Posts update RLS, RPC grants, storage upsert policies
-- =============================================

-- Posts: authors must update image_url after image upload
DROP POLICY IF EXISTS "Own update posts" ON public.posts;
CREATE POLICY "Own update posts" ON public.posts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Company CV download flow (Applicants page)
GRANT EXECUTE ON FUNCTION public.get_application_cv_url(UUID) TO authenticated;

-- Storage upsert requires UPDATE on existing objects
DROP POLICY IF EXISTS "Avatar update own" ON storage.objects;
CREATE POLICY "Avatar update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Logo update own" ON storage.objects;
CREATE POLICY "Logo update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Post image update own" ON storage.objects;
CREATE POLICY "Post image update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Doc update own" ON storage.objects;
CREATE POLICY "Doc update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'candidate-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'candidate-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Idempotent re-apply of company CV read access (from 016)
DROP POLICY IF EXISTS "Company read applicant CVs" ON storage.objects;
CREATE POLICY "Company read applicant CVs" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'candidate-documents'
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON a.job_id = j.id
      WHERE j.company_id = auth.uid()
        AND a.cv_url = name
    )
  );

-- Allow app-generated notifications (verification flow, etc.)
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO notifications (recipient_id, type, title, body, metadata)
  VALUES (p_recipient_id, p_type, p_title, p_body, p_metadata)
  RETURNING * INTO v_notification;

  RETURN v_notification;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
