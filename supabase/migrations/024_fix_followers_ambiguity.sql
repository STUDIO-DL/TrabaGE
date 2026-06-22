-- =============================================
-- 024_fix_followers_ambiguity.sql
-- Fix ambiguous column reference in follower queries.
-- =============================================

-- The error "column reference 'user_id' is ambiguous" can occur in queries
-- joining 'followers' and profile tables ('candidate_profiles', 'company_profiles')
-- without qualifying which table's 'user_id' should be used.

-- To resolve this, we create a well-defined RPC function that correctly qualifies
-- all column names. This function should be used to fetch follower data.

CREATE OR REPLACE FUNCTION public.get_user_followers(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  headline TEXT,
  followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id, -- CRITICAL FIX: Explicitly select user_id from the profiles table.
    p.full_name,
    p.avatar_url,
    p.headline,
    f.created_at AS followed_at
  FROM public.followers f
  JOIN public.candidate_profiles p ON f.follower_id = p.user_id
  WHERE f.following_id = p_user_id
  ORDER BY f.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_followers(UUID) TO authenticated;