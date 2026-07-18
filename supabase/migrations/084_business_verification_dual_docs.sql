-- =============================================
-- 084_business_verification_dual_docs.sql
-- Business verification MVP: dual documents, role fix, rejection_reason
-- =============================================

ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS company_document_type TEXT,
  ADD COLUMN IF NOT EXISTS company_document_path TEXT,
  ADD COLUMN IF NOT EXISTS representative_document_type TEXT,
  ADD COLUMN IF NOT EXISTS representative_document_path TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Backfill from legacy single-document column
UPDATE public.verification_requests
SET
  company_document_path = COALESCE(company_document_path, verification_document_path),
  company_document_type = COALESCE(company_document_type, 'nif')
WHERE verification_document_path IS NOT NULL
  AND company_document_path IS NULL;

ALTER TABLE public.verification_requests
  DROP CONSTRAINT IF EXISTS verification_requests_company_document_type_check;

ALTER TABLE public.verification_requests
  ADD CONSTRAINT verification_requests_company_document_type_check
  CHECK (
    company_document_type IS NULL
    OR company_document_type IN ('nif', 'licencia_comercial')
  );

ALTER TABLE public.verification_requests
  DROP CONSTRAINT IF EXISTS verification_requests_representative_document_type_check;

ALTER TABLE public.verification_requests
  ADD CONSTRAINT verification_requests_representative_document_type_check
  CHECK (
    representative_document_type IS NULL
    OR representative_document_type IN ('dip', 'pasaporte')
  );

CREATE OR REPLACE FUNCTION public.submit_verification_request(
  p_company_document_type TEXT,
  p_company_document_path TEXT,
  p_representative_document_type TEXT,
  p_representative_document_path TEXT,
  p_company_document_name TEXT DEFAULT NULL,
  p_representative_document_name TEXT DEFAULT NULL
)
RETURNS public.verification_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_id UUID := auth.uid();
  v_request public.verification_requests;
  v_company_path TEXT := trim(coalesce(p_company_document_path, ''));
  v_representative_path TEXT := trim(coalesce(p_representative_document_path, ''));
  v_company_type TEXT := lower(trim(coalesce(p_company_document_type, '')));
  v_representative_type TEXT := lower(trim(coalesce(p_representative_document_type, '')));
  v_role TEXT := public.get_my_role();
BEGIN
  IF v_role NOT IN ('business', 'organization', 'company') THEN
    RAISE EXCEPTION 'Solo cuentas Business u organización pueden enviar verificación';
  END IF;

  IF v_company_type NOT IN ('nif', 'licencia_comercial') THEN
    RAISE EXCEPTION 'Tipo de documento de empresa inválido';
  END IF;

  IF v_representative_type NOT IN ('dip', 'pasaporte') THEN
    RAISE EXCEPTION 'Tipo de documento del representante inválido';
  END IF;

  IF v_company_path = '' OR v_company_path NOT LIKE v_company_id::TEXT || '/%' THEN
    RAISE EXCEPTION 'Documento de empresa inválido';
  END IF;

  IF v_representative_path = '' OR v_representative_path NOT LIKE v_company_id::TEXT || '/%' THEN
    RAISE EXCEPTION 'Documento del representante inválido';
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
    WHERE (
      company_document_path = v_company_path
      OR representative_document_path = v_representative_path
      OR verification_document_path IN (v_company_path, v_representative_path)
    )
    AND status IN ('pending', 'approved')
    AND company_id <> v_company_id
  ) THEN
    RAISE EXCEPTION 'Documento ya vinculado a otra solicitud';
  END IF;

  INSERT INTO public.verification_requests (
    company_id,
    company_document_type,
    company_document_path,
    representative_document_type,
    representative_document_path,
    verification_document_path,
    document_name,
    status
  ) VALUES (
    v_company_id,
    v_company_type,
    v_company_path,
    v_representative_type,
    v_representative_path,
    v_company_path,
    NULLIF(
      trim(
        coalesce(p_company_document_name, '')
        || CASE
          WHEN coalesce(p_representative_document_name, '') <> '' THEN ' + ' || p_representative_document_name
          ELSE ''
        END
      ),
      ''
    ),
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

DROP FUNCTION IF EXISTS public.submit_verification_request(TEXT, TEXT);

REVOKE ALL ON FUNCTION public.submit_verification_request(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_verification_request(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

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
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden revisar solicitudes';
  END IF;

  IF p_action NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Acción inválida';
  END IF;

  SELECT * INTO v_request
  FROM public.verification_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
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

-- Storage policies: allow company + representative doc paths under owner folder
DROP POLICY IF EXISTS "Company verification update own" ON storage.objects;
CREATE POLICY "Company verification update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-verifications'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
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
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Company verification delete own" ON storage.objects;
CREATE POLICY "Company verification delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-verifications'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
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
  );
