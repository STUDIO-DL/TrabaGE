-- =============================================
-- 086_verification_workflow_regressions.sql
-- Restore dual-document uploads and keep admin review state consistent.
-- =============================================

UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
WHERE id = 'company-verifications';

CREATE OR REPLACE FUNCTION public.require_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.require_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.require_admin() TO authenticated, service_role;

DROP POLICY IF EXISTS "Company verification upload own" ON storage.objects;
CREATE POLICY "Company verification upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-verifications'
    AND (
      (
        name = auth.uid()::TEXT || '/company-document.pdf'
        AND coalesce(metadata->>'mimetype', 'application/pdf') = 'application/pdf'
      )
      OR
      (
        name = auth.uid()::TEXT || '/representative-document.pdf'
        AND coalesce(metadata->>'mimetype', 'application/pdf') IN (
          'application/pdf',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp'
        )
      )
    )
    AND coalesce((metadata->>'size')::BIGINT, 0) <= 5242880
  );

DROP POLICY IF EXISTS "Company verification update own" ON storage.objects;
CREATE POLICY "Company verification update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-verifications'
    AND name IN (
      auth.uid()::TEXT || '/company-document.pdf',
      auth.uid()::TEXT || '/representative-document.pdf'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.verification_requests vr
      WHERE vr.company_id = auth.uid()
        AND (
          vr.company_document_path = name
          OR vr.representative_document_path = name
          OR vr.verification_document_path = name
        )
        AND vr.status IN ('pending', 'approved')
    )
  )
  WITH CHECK (
    bucket_id = 'company-verifications'
    AND (
      (
        name = auth.uid()::TEXT || '/company-document.pdf'
        AND coalesce(metadata->>'mimetype', 'application/pdf') = 'application/pdf'
      )
      OR
      (
        name = auth.uid()::TEXT || '/representative-document.pdf'
        AND coalesce(metadata->>'mimetype', 'application/pdf') IN (
          'application/pdf',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp'
        )
      )
    )
    AND coalesce((metadata->>'size')::BIGINT, 0) <= 5242880
  );

CREATE OR REPLACE FUNCTION public.review_verification_request(
  p_request_id UUID,
  p_action TEXT,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_request public.verification_requests;
BEGIN
  PERFORM public.require_admin();

  IF p_action NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Acción inválida';
  END IF;

  SELECT * INTO v_request
  FROM public.verification_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'La solicitud ya fue revisada';
  END IF;

  UPDATE public.verification_requests
  SET
    status = p_action,
    review_notes = p_review_notes,
    rejection_reason = CASE WHEN p_action = 'rejected' THEN p_review_notes ELSE NULL END,
    reviewed_at = NOW(),
    reviewed_by = v_admin_id
  WHERE id = p_request_id;

  IF p_action = 'approved' THEN
    UPDATE public.company_profiles
    SET
      is_verified = TRUE,
      verification_status = 'approved',
      verified_status = 'verified',
      verified_at = NOW(),
      verified_by = v_admin_id
    WHERE user_id = v_request.company_id;
  ELSE
    UPDATE public.company_profiles
    SET
      is_verified = FALSE,
      verification_status = 'rejected',
      verified_status = 'rejected'
    WHERE user_id = v_request.company_id;
  END IF;

  RETURN jsonb_build_object(
    'request_id', p_request_id,
    'company_id', v_request.company_id,
    'status', p_action
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_verification_request(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_verification_request(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_manual_verify_company(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_role TEXT;
BEGIN
  PERFORM public.require_admin();

  SELECT ur.role INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = p_user_id;

  IF v_role NOT IN ('business', 'organization', 'company') THEN
    RAISE EXCEPTION 'Solo cuentas Business u organización pueden verificarse';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.company_profiles cp WHERE cp.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Perfil de empresa no encontrado';
  END IF;

  UPDATE public.verification_requests
  SET
    status = 'approved',
    review_notes = coalesce(review_notes, 'Verificación manual'),
    rejection_reason = NULL,
    reviewed_at = NOW(),
    reviewed_by = v_admin_id
  WHERE company_id = p_user_id
    AND status = 'pending';

  UPDATE public.company_profiles
  SET
    is_verified = TRUE,
    verification_status = 'approved',
    verified_status = 'verified',
    verified_at = NOW(),
    verified_by = v_admin_id,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_manual_verify_company(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_manual_verify_company(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
