-- =============================================
-- 027_fix_company_followers_ambiguity.sql
-- Fix ambiguous column reference in get_followers function.
-- =============================================

-- The error "column reference 'user_id' is ambiguous" occurs when fetching
-- company followers because the query joins 'follows' and 'candidate_profiles',
-- both of which have a 'user_id' column.

-- This was fixed for user-to-user follows in migration 024, but the fix was
-- also needed here. This migration replaces the function with a corrected
-- version that explicitly qualifies the 'user_id' column from the
-- candidate_profiles table.

CREATE OR REPLACE FUNCTION public.get_followers(
  p_target_type TEXT,
  p_target_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  headline TEXT,
  avatar_path TEXT,
  followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (auth.uid() = p_target_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    cp.user_id, -- CRITICAL FIX: Explicitly select user_id from the profiles table.
    cp.full_name,
    cp.headline,
    cp.avatar_path,
    f.created_at AS followed_at
  FROM public.follows f
  JOIN public.candidate_profiles cp ON cp.user_id = f.user_id
  WHERE f.target_type = p_target_type AND f.target_id = p_target_id
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_followers(TEXT, UUID, INT, INT) TO authenticated;