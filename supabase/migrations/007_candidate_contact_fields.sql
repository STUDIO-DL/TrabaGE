-- =============================================
-- 007_candidate_contact_fields.sql
-- =============================================

ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT;

-- =============================================
-- 008_delete_own_account.sql
-- =============================================

CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;
