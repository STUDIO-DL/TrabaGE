-- =============================================
-- 020_storage_optimization.sql
-- Optimized buckets, path-only DB columns, RLS
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('candidate-cvs', 'candidate-cvs', FALSE),
  ('candidate-avatars', 'candidate-avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- candidate_profiles: paths + cover letter text
ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS cover_letter TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'candidate_profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.candidate_profiles RENAME COLUMN avatar_url TO avatar_path;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'candidate_profiles' AND column_name = 'cv_url'
  ) THEN
    ALTER TABLE public.candidate_profiles RENAME COLUMN cv_url TO cv_path;
  END IF;
END $$;

UPDATE public.candidate_profiles
SET avatar_path = substring(avatar_path from 'candidate-avatars/(.+)$')
WHERE avatar_path LIKE '%/candidate-avatars/%';

UPDATE public.candidate_profiles
SET avatar_path = substring(avatar_path from 'avatars/(.+)$')
WHERE avatar_path LIKE '%/avatars/%';

UPDATE public.candidate_profiles
SET cv_path = substring(cv_path from 'candidate-cvs/(.+)$')
WHERE cv_path LIKE '%/candidate-cvs/%';

UPDATE public.candidate_profiles
SET cv_path = substring(cv_path from 'candidate-documents/(.+)$')
WHERE cv_path LIKE '%/candidate-documents/%';

UPDATE public.candidate_profiles
SET cv_path = user_id::text || '/cv.pdf'
WHERE cv_path IS NOT NULL
  AND cv_path NOT LIKE '%/%';

-- company_profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'company_profiles' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.company_profiles RENAME COLUMN logo_url TO logo_path;
  END IF;
END $$;

UPDATE public.company_profiles
SET logo_path = substring(logo_path from 'company-logos/(.+)$')
WHERE logo_path LIKE '%/company-logos/%';

-- posts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.posts RENAME COLUMN image_url TO post_image_path;
  END IF;
END $$;

UPDATE public.posts
SET post_image_path = substring(post_image_path from 'post-images/(.+)$')
WHERE post_image_path LIKE '%/post-images/%';

UPDATE public.posts
SET post_image_path = regexp_replace(post_image_path, '^(.+)/posts/', '\1/')
WHERE post_image_path LIKE '%/posts/%';

-- verification_requests
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'verification_requests' AND column_name = 'document_url'
  ) THEN
    ALTER TABLE public.verification_requests RENAME COLUMN document_url TO verification_document_path;
  END IF;
END $$;

UPDATE public.verification_requests
SET verification_document_path = substring(verification_document_path from 'company-verifications/(.+)$')
WHERE verification_document_path LIKE '%/company-verifications/%';

UPDATE public.verification_requests
SET verification_document_path = company_id::text || '/verification-document.pdf'
WHERE verification_document_path IS NOT NULL
  AND verification_document_path NOT LIKE '%/%';

-- applications
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'cv_url'
  ) THEN
    ALTER TABLE public.applications RENAME COLUMN cv_url TO cv_path;
  END IF;
END $$;

UPDATE public.applications
SET cv_path = substring(cv_path from 'candidate-cvs/(.+)$')
WHERE cv_path LIKE '%/candidate-cvs/%';

UPDATE public.applications
SET cv_path = substring(cv_path from 'candidate-documents/(.+)$')
WHERE cv_path LIKE '%/candidate-documents/%';

-- Drop legacy cover letter file columns
ALTER TABLE public.candidate_profiles
  DROP COLUMN IF EXISTS cover_letter_url,
  DROP COLUMN IF EXISTS cover_letter_name;

-- RPC: return CV storage path for authorized company
CREATE OR REPLACE FUNCTION public.get_application_cv_path(app_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cv_path TEXT;
  v_job_company UUID;
BEGIN
  SELECT a.cv_path, j.company_id
  INTO v_cv_path, v_job_company
  FROM applications a
  JOIN jobs j ON a.job_id = j.id
  WHERE a.id = app_id;

  IF v_job_company IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN v_cv_path;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_application_cv_path(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.get_application_cv_url(UUID);

-- Verification submit uses path column (drop old signature: p_document_url)
DROP FUNCTION IF EXISTS public.submit_verification_request(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.submit_verification_request(
  p_document_path TEXT,
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
    verification_document_path,
    document_name,
    status
  ) VALUES (
    v_company_id,
    p_document_path,
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

GRANT EXECUTE ON FUNCTION public.submit_verification_request(TEXT, TEXT) TO authenticated;

-- Admin users list with path columns (drop old return columns: avatar_url, logo_url)
DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role TEXT,
  full_name TEXT,
  company_name TEXT,
  city TEXT,
  avatar_path TEXT,
  logo_path TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden listar usuarios';
  END IF;

  RETURN QUERY
  SELECT
    ur.user_id,
    au.email::TEXT,
    ur.role,
    cp.full_name,
    co.company_name,
    COALESCE(cp.city, co.city) AS city,
    cp.avatar_path,
    co.logo_path,
    COALESCE(cp.is_active, co.is_active, TRUE) AS is_active,
    ur.created_at
  FROM public.user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  LEFT JOIN public.candidate_profiles cp ON cp.user_id = ur.user_id
  LEFT JOIN public.company_profiles co ON co.user_id = ur.user_id
  WHERE ur.role <> 'admin'
  ORDER BY ur.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

-- candidate-cvs policies
DROP POLICY IF EXISTS "Candidate CV upload own" ON storage.objects;
CREATE POLICY "Candidate CV upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Candidate CV update own" ON storage.objects;
CREATE POLICY "Candidate CV update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'candidate-cvs' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'candidate-cvs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Candidate CV read own" ON storage.objects;
CREATE POLICY "Candidate CV read own" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'candidate-cvs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Candidate CV delete own" ON storage.objects;
CREATE POLICY "Candidate CV delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'candidate-cvs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Company read applicant CVs optimized" ON storage.objects;
CREATE POLICY "Company read applicant CVs optimized" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'candidate-cvs'
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON a.job_id = j.id
      WHERE j.company_id = auth.uid()
        AND a.cv_path = name
    )
  );

-- Legacy candidate-documents read for old application paths
DROP POLICY IF EXISTS "Company read applicant CVs legacy" ON storage.objects;
CREATE POLICY "Company read applicant CVs legacy" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'candidate-documents'
    AND EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON a.job_id = j.id
      WHERE j.company_id = auth.uid()
        AND a.cv_path = name
    )
  );

-- candidate-avatars policies
DROP POLICY IF EXISTS "Candidate avatar upload own" ON storage.objects;
CREATE POLICY "Candidate avatar upload own" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Candidate avatar update own" ON storage.objects;
CREATE POLICY "Candidate avatar update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'candidate-avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'candidate-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Candidate avatar public read" ON storage.objects;
CREATE POLICY "Candidate avatar public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'candidate-avatars');

DROP POLICY IF EXISTS "Candidate avatar delete own" ON storage.objects;
CREATE POLICY "Candidate avatar delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'candidate-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- company-logos: delete + fixed path support
DROP POLICY IF EXISTS "Logo delete own" ON storage.objects;
CREATE POLICY "Logo delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- post-images: delete policy
DROP POLICY IF EXISTS "Post image delete own" ON storage.objects;
CREATE POLICY "Post image delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- company-verifications: update + delete + fixed path
DROP POLICY IF EXISTS "Company verification update own" ON storage.objects;
CREATE POLICY "Company verification update own" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-verifications' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'company-verifications' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Company verification delete own" ON storage.objects;
CREATE POLICY "Company verification delete own" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-verifications' AND (storage.foldername(name))[1] = auth.uid()::text);
