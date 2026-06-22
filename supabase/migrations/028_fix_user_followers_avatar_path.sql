-- =============================================
-- 028_fix_user_followers_avatar_path.sql
-- Fix avatar_url reference in get_user_followers function.
-- =============================================

-- Migration 020 renamed `avatar_url` to `avatar_path` in the candidate_profiles table.
-- However, migration 024, which was created later, incorrectly defined the
-- `get_user_followers` function using the old `avatar_url` column name.

-- This migration replaces the function with a corrected version that uses `avatar_path`
-- to align with the current database schema.

DROP FUNCTION IF EXISTS public.get_user_followers(UUID);

CREATE FUNCTION public.get_user_followers(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_path TEXT, -- Changed from avatar_url
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
    p.user_id,
    p.full_name,
    p.avatar_path, -- CRITICAL FIX: Changed from p.avatar_url
    p.headline,
    f.created_at AS followed_at
  FROM public.followers f
  JOIN public.candidate_profiles p ON f.follower_id = p.user_id
  WHERE f.following_id = p_user_id
  ORDER BY f.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_followers(UUID) TO authenticated;