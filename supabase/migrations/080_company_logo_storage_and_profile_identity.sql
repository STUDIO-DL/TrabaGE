-- =============================================
-- 080_company_logo_storage_and_profile_identity.sql
-- Fix company logo/cover uploads blocked when storage metadata.size is NULL
-- and ensure employer storage policies recognize legacy organization roles.
-- =============================================

CREATE OR REPLACE FUNCTION public.is_active_company(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.company_profiles cp ON cp.user_id = ur.user_id
    WHERE ur.user_id = p_user_id
      AND lower(coalesce(ur.role, '')) IN ('business', 'organization', 'company', 'institution')
      AND coalesce(cp.is_active, true) = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_company(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_company(UUID) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Company logo upload own" ON storage.objects;
CREATE POLICY "Company logo upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND name IN (auth.uid()::TEXT || '/logo.webp', auth.uid()::TEXT || '/cover.webp')
    AND public.is_active_company(auth.uid())
    AND coalesce(metadata->>'mimetype', 'image/webp') = 'image/webp'
    AND coalesce((metadata->>'size')::BIGINT, 0) <= 3145728
  );

DROP POLICY IF EXISTS "Company logo update own" ON storage.objects;
CREATE POLICY "Company logo update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND name IN (auth.uid()::TEXT || '/logo.webp', auth.uid()::TEXT || '/cover.webp')
    AND public.is_active_company(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'company-logos'
    AND name IN (auth.uid()::TEXT || '/logo.webp', auth.uid()::TEXT || '/cover.webp')
    AND public.is_active_company(auth.uid())
    AND coalesce(metadata->>'mimetype', 'image/webp') = 'image/webp'
    AND coalesce((metadata->>'size')::BIGINT, 0) <= 3145728
  );

DROP POLICY IF EXISTS "Logo delete own" ON storage.objects;
CREATE POLICY "Logo delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND name IN (auth.uid()::TEXT || '/logo.webp', auth.uid()::TEXT || '/cover.webp')
    AND public.is_active_company(auth.uid())
  );

DROP POLICY IF EXISTS "Company logo public read" ON storage.objects;
CREATE POLICY "Company logo public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');
