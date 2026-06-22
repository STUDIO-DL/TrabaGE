-- =============================================
-- 035_update_search_rpc.sql
-- Updates the search_candidates RPC to use the new FTS index.
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
DECLARE
  fts_query TSQUERY;
BEGIN
  -- Use websearch_to_tsquery for user-friendly search syntax
  fts_query := websearch_to_tsquery('spanish', keyword);

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
    cp.is_active = true AND cp.fts @@ fts_query
  ORDER BY ts_rank(cp.fts, fts_query) DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_candidates(TEXT, INT) TO authenticated;