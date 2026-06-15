-- =============================================
-- 011_company_verification_system.sql
-- Company verification MVP: fields, bucket, RPC, RLS
-- =============================================

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'not_submitted';

UPDATE public.company_profiles
SET
  is_verified = (verified_status = 'verified'),
  verification_status = CASE verified_status
    WHEN 'verified' THEN 'approved'
    WHEN 'pending' THEN 'pending'
    WHEN 'rejected' THEN 'rejected'
    ELSE 'not_submitted'
  END;

ALTER TABLE public.company_profiles
  DROP CONSTRAINT IF EXISTS company_profiles_verification_status_check;

ALTER TABLE public.company_profiles
  ADD CONSTRAINT company_profiles_verification_status_check
  CHECK (verification_status IN ('not_submitted', 'pending', 'approved', 'rejected'));

ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS document_name TEXT,
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.verification_requests
SET created_at = submitted_at
WHERE created_at IS NULL;

UPDATE public.verification_requests
SET status = 'approved'
WHERE status = 'verified';

ALTER TABLE public.verification_requests
  DROP CONSTRAINT IF EXISTS verification_requests_status_check;

ALTER TABLE public.verification_requests
  ADD CONSTRAINT verification_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-verifications', 'company-verifications', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Company verification upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-verifications'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Company verification read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-verifications'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Company verification admin read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-verifications'
    AND get_my_role() = 'admin'
  );

CREATE OR REPLACE FUNCTION public.submit_verification_request(
  p_document_url TEXT,
  p_document_name TEXT
)
RETURNS public.verification_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID := auth.uid();
  v_request public.verification_requests;
BEGIN
  IF get_my_role() <> 'company' THEN
    RAISE EXCEPTION 'Solo empresas pueden enviar verificación';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM company_profiles WHERE user_id = v_company_id) THEN
    RAISE EXCEPTION 'Perfil de empresa no encontrado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM verification_requests
    WHERE company_id = v_company_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Ya existe una solicitud pendiente';
  END IF;

  INSERT INTO verification_requests (
    company_id,
    document_url,
    document_name,
    status
  ) VALUES (
    v_company_id,
    p_document_url,
    p_document_name,
    'pending'
  )
  RETURNING * INTO v_request;

  UPDATE company_profiles
  SET
    verification_status = 'pending',
    verified_status = 'pending',
    is_verified = FALSE
  WHERE user_id = v_company_id;

  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_verification_request(
  p_request_id UUID,
  p_action TEXT,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_request public.verification_requests;
BEGIN
  IF get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden revisar solicitudes';
  END IF;

  IF p_action NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Acción inválida';
  END IF;

  SELECT * INTO v_request
  FROM verification_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
  END IF;

  UPDATE verification_requests
  SET
    status = p_action,
    review_notes = p_review_notes,
    reviewed_at = NOW(),
    reviewed_by = v_admin_id
  WHERE id = p_request_id;

  IF p_action = 'approved' THEN
    UPDATE company_profiles
    SET
      is_verified = TRUE,
      verification_status = 'approved',
      verified_status = 'verified',
      verified_at = NOW(),
      verified_by = v_admin_id
    WHERE user_id = v_request.company_id;
  ELSE
    UPDATE company_profiles
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

GRANT EXECUTE ON FUNCTION public.submit_verification_request(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_verification_request(UUID, TEXT, TEXT) TO authenticated;

CREATE POLICY "Admin update companies verification"
  ON company_profiles FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');
