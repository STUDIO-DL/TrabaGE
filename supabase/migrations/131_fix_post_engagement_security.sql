-- =============================================
-- 131_fix_post_engagement_security.sql
-- Root-cause fix for likes/comments failures:
-- 1) Counter triggers must be SECURITY DEFINER so
--    likes_count/comments_count updates are not
--    blocked by posts RLS (author-only UPDATE).
-- 2) Engagement RPCs set row_security = off so
--    inserts into post_likes / post_comments work
--    reliably under SECURITY DEFINER.
-- 3) assert_rate_limit callable by definer RPCs.
-- 4) Re-grant execute + reload PostgREST schema.
-- =============================================

-- Rate-limit helper: allow SECURITY DEFINER callers
GRANT EXECUTE ON FUNCTION public.assert_rate_limit(UUID, TEXT, INT, INTERVAL)
  TO postgres, service_role;

GRANT USAGE, SELECT ON SEQUENCE public.security_rate_events_id_seq
  TO postgres, service_role;

-- ─── Counter triggers (SECURITY DEFINER) ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.bump_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET likes_count = coalesce(likes_count, 0) + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;

  UPDATE public.posts
  SET likes_count = GREATEST(coalesce(likes_count, 0) - 1, 0)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_comment_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_comments
    SET likes_count = coalesce(likes_count, 0) + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
  END IF;

  UPDATE public.post_comments
  SET likes_count = GREATEST(coalesce(likes_count, 0) - 1, 0)
  WHERE id = OLD.comment_id;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET comments_count = coalesce(comments_count, 0) + 1
    WHERE id = NEW.post_id;
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE public.post_comments
      SET replies_count = coalesce(replies_count, 0) + 1
      WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET comments_count = GREATEST(coalesce(comments_count, 0) - 1, 0)
    WHERE id = OLD.post_id;
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE public.post_comments
      SET replies_count = GREATEST(coalesce(replies_count, 0) - 1, 0)
      WHERE id = OLD.parent_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_post_reposts_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET reposts_count = coalesce(reposts_count, 0) + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;

  UPDATE public.posts
  SET reposts_count = GREATEST(coalesce(reposts_count, 0) - 1, 0)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

-- Recreate triggers to bind updated functions
DROP TRIGGER IF EXISTS trg_post_likes_count ON public.post_likes;
CREATE TRIGGER trg_post_likes_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_likes_count();

DROP TRIGGER IF EXISTS trg_comment_likes_count ON public.comment_likes;
CREATE TRIGGER trg_comment_likes_count
  AFTER INSERT OR DELETE ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.bump_comment_likes_count();

DROP TRIGGER IF EXISTS trg_post_comments_count ON public.post_comments;
CREATE TRIGGER trg_post_comments_count
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_comments_count();

DROP TRIGGER IF EXISTS trg_post_reposts_count ON public.post_reposts;
CREATE TRIGGER trg_post_reposts_count
  AFTER INSERT OR DELETE ON public.post_reposts
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_reposts_count();

-- ─── Engagement RPCs with row_security = off ────────────────────────────────

CREATE OR REPLACE FUNCTION public.toggle_post_like(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_liked BOOLEAN;
  v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_post_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = p_post_id AND coalesce(p.is_hidden, FALSE) = FALSE
  ) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  PERFORM public.assert_rate_limit(v_uid, 'post:like', 120, interval '1 hour');

  IF EXISTS (
    SELECT 1 FROM public.post_likes
    WHERE post_id = p_post_id AND user_id = v_uid
  ) THEN
    DELETE FROM public.post_likes
    WHERE post_id = p_post_id AND user_id = v_uid;
    v_liked := FALSE;
  ELSE
    INSERT INTO public.post_likes (post_id, user_id)
    VALUES (p_post_id, v_uid);
    v_liked := TRUE;
  END IF;

  SELECT likes_count INTO v_count FROM public.posts WHERE id = p_post_id;
  RETURN jsonb_build_object('liked', v_liked, 'likes_count', coalesce(v_count, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_comment_like(p_comment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_liked BOOLEAN;
  v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_comment_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.post_comments c
    WHERE c.id = p_comment_id AND coalesce(c.is_hidden, FALSE) = FALSE
  ) THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  PERFORM public.assert_rate_limit(v_uid, 'comment:like', 120, interval '1 hour');

  IF EXISTS (
    SELECT 1 FROM public.comment_likes
    WHERE comment_id = p_comment_id AND user_id = v_uid
  ) THEN
    DELETE FROM public.comment_likes
    WHERE comment_id = p_comment_id AND user_id = v_uid;
    v_liked := FALSE;
  ELSE
    INSERT INTO public.comment_likes (comment_id, user_id)
    VALUES (p_comment_id, v_uid);
    v_liked := TRUE;
  END IF;

  SELECT likes_count INTO v_count FROM public.post_comments WHERE id = p_comment_id;
  RETURN jsonb_build_object('liked', v_liked, 'likes_count', coalesce(v_count, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.create_post_comment(
  p_post_id UUID,
  p_body TEXT,
  p_parent_id UUID DEFAULT NULL
)
RETURNS public.post_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.post_comments;
  v_trimmed TEXT := trim(coalesce(p_body, ''));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF char_length(v_trimmed) < 1 OR char_length(v_trimmed) > 2000 THEN
    RAISE EXCEPTION 'Invalid comment body';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = p_post_id AND coalesce(p.is_hidden, FALSE) = FALSE
  ) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF p_parent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.post_comments c
    WHERE c.id = p_parent_id
      AND c.post_id = p_post_id
      AND coalesce(c.is_hidden, FALSE) = FALSE
  ) THEN
    RAISE EXCEPTION 'Parent comment not found';
  END IF;

  PERFORM public.assert_rate_limit(v_uid, 'post:comment', 60, interval '1 hour');

  INSERT INTO public.post_comments (post_id, author_id, parent_id, body)
  VALUES (p_post_id, v_uid, p_parent_id, v_trimmed)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_saved_post(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_saved BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_post_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = p_post_id AND coalesce(p.is_hidden, FALSE) = FALSE
  ) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.saved_posts
    WHERE post_id = p_post_id AND user_id = v_uid
  ) THEN
    DELETE FROM public.saved_posts
    WHERE post_id = p_post_id AND user_id = v_uid;
    v_saved := FALSE;
  ELSE
    INSERT INTO public.saved_posts (post_id, user_id)
    VALUES (p_post_id, v_uid);
    v_saved := TRUE;
  END IF;

  RETURN jsonb_build_object('saved', v_saved);
END;
$$;

-- Ensure RLS policies still allow direct client reads
DROP POLICY IF EXISTS "Anyone can read post likes" ON public.post_likes;
CREATE POLICY "Anyone can read post likes" ON public.post_likes
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Users insert own post likes" ON public.post_likes;
CREATE POLICY "Users insert own post likes" ON public.post_likes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own post likes" ON public.post_likes;
CREATE POLICY "Users delete own post likes" ON public.post_likes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can read visible comments" ON public.post_comments;
CREATE POLICY "Anyone can read visible comments" ON public.post_comments
  FOR SELECT TO authenticated
  USING (coalesce(is_hidden, FALSE) = FALSE OR author_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own comments" ON public.post_comments;
CREATE POLICY "Users insert own comments" ON public.post_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Users update own comments" ON public.post_comments;
CREATE POLICY "Users update own comments" ON public.post_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own comments" ON public.post_comments;
CREATE POLICY "Users delete own comments" ON public.post_comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());

-- Grants
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;

REVOKE ALL ON FUNCTION public.toggle_post_like(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_comment_like(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_post_comment(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_saved_post(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.toggle_post_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_comment_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_post_comment(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_saved_post(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_posts_engagement(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_post_comments(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_comment_replies(UUID, INTEGER, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
