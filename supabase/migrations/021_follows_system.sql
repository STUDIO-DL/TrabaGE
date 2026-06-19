-- =============================================
-- 021_follows_system.sql
-- Follow companies & institutions + follower notifications
-- =============================================

CREATE TABLE public.follows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('company', 'institution')),
  target_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX follows_user_id_idx ON public.follows (user_id);
CREATE INDEX follows_target_type_idx ON public.follows (target_type);
CREATE INDEX follows_target_id_idx ON public.follows (target_id);
CREATE INDEX follows_target_lookup_idx ON public.follows (target_type, target_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own follows" ON public.follows
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users create own follows" ON public.follows
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND target_id != auth.uid());

CREATE POLICY "Users delete own follows" ON public.follows
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT;

CREATE OR REPLACE FUNCTION public.get_follower_count(
  p_target_type TEXT,
  p_target_id UUID
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::BIGINT
  FROM public.follows
  WHERE target_type = p_target_type AND target_id = p_target_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_follower_count(TEXT, UUID) TO anon, authenticated;

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
  IF NOT (
    auth.uid() = p_target_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    cp.user_id,
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

CREATE OR REPLACE FUNCTION public.notify_followers(
  p_target_type TEXT,
  p_target_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_ids UUID[];
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_target_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.notifications (recipient_id, type, title, body, metadata)
  SELECT f.user_id, p_type, p_title, p_body, p_metadata
  FROM public.follows f
  WHERE f.target_type = p_target_type AND f.target_id = p_target_id;

  SELECT COALESCE(ARRAY_AGG(f.user_id), ARRAY[]::UUID[])
  INTO v_recipient_ids
  FROM public.follows f
  WHERE f.target_type = p_target_type AND f.target_id = p_target_id;

  RETURN v_recipient_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_followers(TEXT, UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
