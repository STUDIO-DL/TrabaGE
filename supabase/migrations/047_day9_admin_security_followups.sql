-- =============================================
-- 047_day9_admin_security_followups.sql
-- Follow-up hardening from admin security audit.
-- =============================================

DROP POLICY IF EXISTS "Admin read all companies" ON public.company_profiles;
CREATE POLICY "Admin read all companies" ON public.company_profiles
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admin read all posts" ON public.posts;
CREATE POLICY "Admin read all posts" ON public.posts
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE OR REPLACE FUNCTION public.protect_job_admin_moderation_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
    AND public.get_my_role() <> 'admin'
    AND NEW.admin_hidden IS DISTINCT FROM OLD.admin_hidden
  THEN
    NEW.admin_hidden := OLD.admin_hidden;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_job_admin_moderation_fields_trigger ON public.jobs;
CREATE TRIGGER protect_job_admin_moderation_fields_trigger
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.protect_job_admin_moderation_fields();

CREATE OR REPLACE FUNCTION public.protect_post_admin_moderation_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
    AND public.get_my_role() <> 'admin'
    AND NEW.is_hidden IS DISTINCT FROM OLD.is_hidden
  THEN
    NEW.is_hidden := OLD.is_hidden;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_post_admin_moderation_fields_trigger ON public.posts;
CREATE TRIGGER protect_post_admin_moderation_fields_trigger
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.protect_post_admin_moderation_fields();

CREATE OR REPLACE FUNCTION public.prevent_hidden_post_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
    AND public.get_my_role() <> 'admin'
    AND coalesce(OLD.is_hidden, false) = true
  THEN
    RAISE EXCEPTION 'Moderated posts cannot be deleted by their author';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_hidden_post_delete_trigger ON public.posts;
CREATE TRIGGER prevent_hidden_post_delete_trigger
  BEFORE DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_hidden_post_delete();

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
  IF public.get_my_role() <> 'company' THEN
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
        AND vr.verification_document_path = name
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
        AND vr.verification_document_path = name
        AND vr.status IN ('pending', 'approved')
    )
  );

REVOKE ALL ON FUNCTION public.protect_job_admin_moderation_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_post_admin_moderation_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_hidden_post_delete() FROM PUBLIC;
