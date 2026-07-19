-- =============================================
-- 086_post_image_upload_and_content_fix.sql
-- Fix post image uploads blocked when storage metadata.size is NULL
-- (same root cause fixed for company logos in 080).
-- Allow image-only posts by relaxing content length minimum.
-- =============================================

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_content_length_check,
  ADD CONSTRAINT posts_content_length_check
    CHECK (char_length(trim(content)) <= 2000) NOT VALID;

DROP POLICY IF EXISTS "Post image upload own" ON storage.objects;
CREATE POLICY "Post image upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND lower(name) LIKE '%.webp'
    AND (
      public.is_active_candidate(auth.uid())
      OR public.is_active_company(auth.uid())
    )
    AND coalesce(metadata->>'mimetype', 'image/webp') = 'image/webp'
    AND coalesce((metadata->>'size')::BIGINT, 0) <= 3145728
  );

DROP POLICY IF EXISTS "Post image update own" ON storage.objects;
CREATE POLICY "Post image update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND (
      public.is_active_candidate(auth.uid())
      OR public.is_active_company(auth.uid())
    )
  )
  WITH CHECK (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND lower(name) LIKE '%.webp'
    AND (
      public.is_active_candidate(auth.uid())
      OR public.is_active_company(auth.uid())
    )
    AND coalesce(metadata->>'mimetype', 'image/webp') = 'image/webp'
    AND coalesce((metadata->>'size')::BIGINT, 0) <= 3145728
  );
