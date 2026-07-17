-- =============================================
-- 068_employer_verification_role_fix.sql
-- Keep verification submissions working after migration 064 replaced
-- the legacy company role with business / organization.
-- =============================================

CREATE OR REPLACE FUNCTION public.submit_verification_request(
  p_document_path TEXT,
  p_document_name TEXT
)
RETURNS public.verification_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_id UUID := auth.uid();
  v_request public.verification_requests;
  v_document_path TEXT := trim(coalesce(p_document_path, ''));
BEGIN
  IF NOT public.is_employer_role(public.get_my_role()) THEN
    RAISE EXCEPTION 'Solo empresas pueden enviar verificación';
  END IF;

  IF v_document_path = '' OR v_document_path NOT LIKE v_company_id::TEXT || '/%' THEN
    RAISE EXCEPTION 'Documento de verificación inválido';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.company_profiles WHERE user_id = v_company_id) THEN
    RAISE EXCEPTION 'Perfil de empresa no encontrado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.verification_requests
    WHERE company_id = v_company_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Ya existe una solicitud pendiente';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.verification_requests
    WHERE verification_document_path = v_document_path
      AND status IN ('pending', 'approved')
  ) THEN
    RAISE EXCEPTION 'Documento ya vinculado a una solicitud';
  END IF;

  INSERT INTO public.verification_requests (
    company_id,
    verification_document_path,
    document_name,
    status
  ) VALUES (
    v_company_id,
    v_document_path,
    p_document_name,
    'pending'
  )
  RETURNING * INTO v_request;

  UPDATE public.company_profiles
  SET
    verification_status = 'pending',
    verified_status = 'pending',
    is_verified = FALSE
  WHERE user_id = v_company_id;

  RETURN v_request;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_verification_request(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_verification_request(TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
