-- =============================================
-- 032_search_candidates_rpc.sql
-- Create an RPC function for powerful candidate searching.
-- =============================================

CREATE OR REPLACE FUNCTION public.search_candidates(keyword TEXT, p_limit INT DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  headline TEXT,
  city TEXT,
  avatar_path TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.user_id,
    cp.full_name,
    cp.headline,
    cp.city,
    cp.avatar_path
  FROM
    public.candidate_profiles AS cp
  WHERE
    cp.is_active = true AND (
      cp.full_name ILIKE ('%' || keyword || '%')
      OR cp.headline ILIKE ('%' || keyword || '%')
      OR cp.about ILIKE ('%' || keyword || '%')
      OR cp.city ILIKE ('%' || keyword || '%')
      OR EXISTS (
        SELECT 1 FROM public.skills s WHERE s.user_id = cp.user_id AND s.name ILIKE ('%' || keyword || '%')
      )
      OR EXISTS (
        SELECT 1 FROM public.experience e WHERE e.user_id = cp.user_id AND (e.position ILIKE ('%' || keyword || '%') OR e.description ILIKE ('%' || keyword || '%'))
      )
    )
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_candidates(TEXT, INT) TO authenticated;