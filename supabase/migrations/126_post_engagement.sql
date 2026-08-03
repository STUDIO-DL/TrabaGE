-- =============================================
-- 126_post_engagement.sql
-- LinkedIn-style post interactions: likes, comments
-- (2-level replies), comment likes, reposts, saves,
-- per-user hide, counters + notification hooks.
-- =============================================

-- ---------- posts: counters + repost pointer ----------
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reposts_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repost_of_id UUID REFERENCES public.posts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_repost_of_id_idx
  ON public.posts (repost_of_id)
  WHERE repost_of_id IS NOT NULL;

-- ---------- post_likes ----------
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS post_likes_user_created_idx
  ON public.post_likes (user_id, created_at DESC);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

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

GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;

-- ---------- post_comments ----------
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  replies_count INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT post_comments_body_length
    CHECK (char_length(trim(body)) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS post_comments_post_created_idx
  ON public.post_comments (post_id, created_at ASC)
  WHERE coalesce(is_hidden, FALSE) = FALSE AND parent_id IS NULL;

CREATE INDEX IF NOT EXISTS post_comments_parent_created_idx
  ON public.post_comments (parent_id, created_at ASC)
  WHERE coalesce(is_hidden, FALSE) = FALSE AND parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS post_comments_author_idx
  ON public.post_comments (author_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;

-- Max 2 levels: parent must be a root comment
CREATE OR REPLACE FUNCTION public.assert_comment_depth()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.post_comments c
    WHERE c.id = NEW.parent_id AND c.parent_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Max comment depth is 2';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.post_comments c
    WHERE c.id = NEW.parent_id AND c.post_id = NEW.post_id
  ) THEN
    RAISE EXCEPTION 'Parent comment must belong to the same post';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assert_comment_depth ON public.post_comments;
CREATE TRIGGER trg_assert_comment_depth
  BEFORE INSERT OR UPDATE OF parent_id ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.assert_comment_depth();

-- ---------- comment_likes ----------
CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS comment_likes_user_idx
  ON public.comment_likes (user_id);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read comment likes" ON public.comment_likes;
CREATE POLICY "Anyone can read comment likes" ON public.comment_likes
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Users insert own comment likes" ON public.comment_likes;
CREATE POLICY "Users insert own comment likes" ON public.comment_likes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own comment likes" ON public.comment_likes;
CREATE POLICY "Users delete own comment likes" ON public.comment_likes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;

-- ---------- post_reposts ----------
CREATE TABLE IF NOT EXISTS public.post_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repost_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  commentary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT post_reposts_unique_user_post UNIQUE (post_id, user_id),
  CONSTRAINT post_reposts_commentary_length
    CHECK (commentary IS NULL OR char_length(trim(commentary)) <= 2000)
);

CREATE INDEX IF NOT EXISTS post_reposts_user_created_idx
  ON public.post_reposts (user_id, created_at DESC);

ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read post reposts" ON public.post_reposts;
CREATE POLICY "Anyone can read post reposts" ON public.post_reposts
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Users insert own post reposts" ON public.post_reposts;
CREATE POLICY "Users insert own post reposts" ON public.post_reposts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own post reposts" ON public.post_reposts;
CREATE POLICY "Users delete own post reposts" ON public.post_reposts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.post_reposts TO authenticated;

-- ---------- saved_posts ----------
CREATE TABLE IF NOT EXISTS public.saved_posts (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS saved_posts_user_created_idx
  ON public.saved_posts (user_id, created_at DESC);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own saved posts" ON public.saved_posts;
CREATE POLICY "Users read own saved posts" ON public.saved_posts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users save own posts" ON public.saved_posts;
CREATE POLICY "Users save own posts" ON public.saved_posts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users unsave own posts" ON public.saved_posts;
CREATE POLICY "Users unsave own posts" ON public.saved_posts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.saved_posts TO authenticated;

-- ---------- hidden_posts (per-user) ----------
CREATE TABLE IF NOT EXISTS public.hidden_posts (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE public.hidden_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own hidden posts" ON public.hidden_posts;
CREATE POLICY "Users manage own hidden posts" ON public.hidden_posts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.hidden_posts TO authenticated;

-- ---------- counter triggers ----------
CREATE OR REPLACE FUNCTION public.bump_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;
  UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_likes_count ON public.post_likes;
CREATE TRIGGER trg_post_likes_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_likes_count();

CREATE OR REPLACE FUNCTION public.bump_comment_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  END IF;
  UPDATE public.post_comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_likes_count ON public.comment_likes;
CREATE TRIGGER trg_comment_likes_count
  AFTER INSERT OR DELETE ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.bump_comment_likes_count();

CREATE OR REPLACE FUNCTION public.bump_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE public.post_comments SET replies_count = replies_count + 1 WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE public.post_comments SET replies_count = GREATEST(replies_count - 1, 0) WHERE id = OLD.parent_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_comments_count ON public.post_comments;
CREATE TRIGGER trg_post_comments_count
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_comments_count();

CREATE OR REPLACE FUNCTION public.bump_post_reposts_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET reposts_count = reposts_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;
  UPDATE public.posts SET reposts_count = GREATEST(reposts_count - 1, 0) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_reposts_count ON public.post_reposts;
CREATE TRIGGER trg_post_reposts_count
  AFTER INSERT OR DELETE ON public.post_reposts
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_reposts_count();

-- ---------- RPCs ----------
CREATE OR REPLACE FUNCTION public.toggle_post_like(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
    SELECT 1 FROM public.posts p WHERE p.id = p_post_id AND coalesce(p.is_hidden, FALSE) = FALSE
  ) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  PERFORM public.assert_rate_limit(v_uid, 'post:like', 120, interval '1 hour');

  IF EXISTS (SELECT 1 FROM public.post_likes WHERE post_id = p_post_id AND user_id = v_uid) THEN
    DELETE FROM public.post_likes WHERE post_id = p_post_id AND user_id = v_uid;
    v_liked := FALSE;
  ELSE
    INSERT INTO public.post_likes (post_id, user_id) VALUES (p_post_id, v_uid);
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

  IF EXISTS (SELECT 1 FROM public.comment_likes WHERE comment_id = p_comment_id AND user_id = v_uid) THEN
    DELETE FROM public.comment_likes WHERE comment_id = p_comment_id AND user_id = v_uid;
    v_liked := FALSE;
  ELSE
    INSERT INTO public.comment_likes (comment_id, user_id) VALUES (p_comment_id, v_uid);
    v_liked := TRUE;
  END IF;

  SELECT likes_count INTO v_count FROM public.post_comments WHERE id = p_comment_id;
  RETURN jsonb_build_object('liked', v_liked, 'likes_count', coalesce(v_count, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_saved_post(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_saved BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_post_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = p_post_id AND coalesce(p.is_hidden, FALSE) = FALSE
  ) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.saved_posts WHERE post_id = p_post_id AND user_id = v_uid) THEN
    DELETE FROM public.saved_posts WHERE post_id = p_post_id AND user_id = v_uid;
    v_saved := FALSE;
  ELSE
    INSERT INTO public.saved_posts (post_id, user_id) VALUES (p_post_id, v_uid);
    v_saved := TRUE;
  END IF;

  RETURN jsonb_build_object('saved', v_saved);
END;
$$;

CREATE OR REPLACE FUNCTION public.hide_post_for_me(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_post_id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  INSERT INTO public.hidden_posts (post_id, user_id)
  VALUES (p_post_id, v_uid)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('hidden', TRUE);
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
    SELECT 1 FROM public.posts p WHERE p.id = p_post_id AND coalesce(p.is_hidden, FALSE) = FALSE
  ) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  PERFORM public.assert_rate_limit(v_uid, 'post:comment', 60, interval '1 hour');

  INSERT INTO public.post_comments (post_id, author_id, parent_id, body)
  VALUES (p_post_id, v_uid, p_parent_id, v_trimmed)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_post_repost(
  p_post_id UUID,
  p_commentary TEXT DEFAULT NULL,
  p_author_type TEXT DEFAULT 'personal'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_original public.posts;
  v_commentary TEXT := NULLIF(trim(coalesce(p_commentary, '')), '');
  v_author_type TEXT := coalesce(NULLIF(trim(p_author_type), ''), 'personal');
  v_repost_post public.posts;
  v_repost public.post_reposts;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_original
  FROM public.posts p
  WHERE p.id = p_post_id AND coalesce(p.is_hidden, FALSE) = FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF v_original.author_id = v_uid THEN
    RAISE EXCEPTION 'Cannot repost your own publication';
  END IF;

  IF EXISTS (SELECT 1 FROM public.post_reposts WHERE post_id = p_post_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'Already reposted';
  END IF;

  IF v_author_type = 'candidate' THEN
    v_author_type := 'personal';
  ELSIF v_author_type = 'company' THEN
    v_author_type := 'business';
  END IF;

  IF v_author_type NOT IN ('personal', 'business', 'organization') THEN
    v_author_type := 'personal';
  END IF;

  PERFORM public.assert_rate_limit(v_uid, 'post:repost', 40, interval '1 hour');

  INSERT INTO public.posts (author_id, author_type, content, repost_of_id, content_type)
  VALUES (
    v_uid,
    v_author_type,
    coalesce(v_commentary, ''),
    p_post_id,
    'post'
  )
  RETURNING * INTO v_repost_post;

  INSERT INTO public.post_reposts (post_id, user_id, repost_post_id, commentary)
  VALUES (p_post_id, v_uid, v_repost_post.id, v_commentary)
  RETURNING * INTO v_repost;

  RETURN jsonb_build_object(
    'repost', to_jsonb(v_repost),
    'repost_post', to_jsonb(v_repost_post),
    'reposts_count', (SELECT reposts_count FROM public.posts WHERE id = p_post_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_posts_engagement(p_post_ids UUID[])
RETURNS TABLE (
  post_id UUID,
  likes_count INTEGER,
  comments_count INTEGER,
  reposts_count INTEGER,
  liked_by_me BOOLEAN,
  saved_by_me BOOLEAN,
  reposted_by_me BOOLEAN,
  hidden_by_me BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    p.id AS post_id,
    p.likes_count,
    p.comments_count,
    p.reposts_count,
    CASE WHEN v_uid IS NULL THEN FALSE ELSE EXISTS (
      SELECT 1 FROM public.post_likes pl WHERE pl.post_id = p.id AND pl.user_id = v_uid
    ) END AS liked_by_me,
    CASE WHEN v_uid IS NULL THEN FALSE ELSE EXISTS (
      SELECT 1 FROM public.saved_posts sp WHERE sp.post_id = p.id AND sp.user_id = v_uid
    ) END AS saved_by_me,
    CASE WHEN v_uid IS NULL THEN FALSE ELSE EXISTS (
      SELECT 1 FROM public.post_reposts pr WHERE pr.post_id = p.id AND pr.user_id = v_uid
    ) END AS reposted_by_me,
    CASE WHEN v_uid IS NULL THEN FALSE ELSE EXISTS (
      SELECT 1 FROM public.hidden_posts hp WHERE hp.post_id = p.id AND hp.user_id = v_uid
    ) END AS hidden_by_me
  FROM public.posts p
  WHERE p.id = ANY (p_post_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_post_comments(
  p_post_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  post_id UUID,
  author_id UUID,
  parent_id UUID,
  body TEXT,
  likes_count INTEGER,
  replies_count INTEGER,
  created_at TIMESTAMPTZ,
  liked_by_me BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_limit INTEGER := GREATEST(1, LEAST(coalesce(p_limit, 20), 50));
  v_offset INTEGER := GREATEST(0, coalesce(p_offset, 0));
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.post_id,
    c.author_id,
    c.parent_id,
    c.body,
    c.likes_count,
    c.replies_count,
    c.created_at,
    CASE WHEN v_uid IS NULL THEN FALSE ELSE EXISTS (
      SELECT 1 FROM public.comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = v_uid
    ) END AS liked_by_me
  FROM public.post_comments c
  WHERE c.post_id = p_post_id
    AND c.parent_id IS NULL
    AND coalesce(c.is_hidden, FALSE) = FALSE
  ORDER BY c.created_at ASC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_comment_replies(
  p_parent_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  post_id UUID,
  author_id UUID,
  parent_id UUID,
  body TEXT,
  likes_count INTEGER,
  replies_count INTEGER,
  created_at TIMESTAMPTZ,
  liked_by_me BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_limit INTEGER := GREATEST(1, LEAST(coalesce(p_limit, 20), 50));
  v_offset INTEGER := GREATEST(0, coalesce(p_offset, 0));
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.post_id,
    c.author_id,
    c.parent_id,
    c.body,
    c.likes_count,
    c.replies_count,
    c.created_at,
    CASE WHEN v_uid IS NULL THEN FALSE ELSE EXISTS (
      SELECT 1 FROM public.comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = v_uid
    ) END AS liked_by_me
  FROM public.post_comments c
  WHERE c.parent_id = p_parent_id
    AND coalesce(c.is_hidden, FALSE) = FALSE
  ORDER BY c.created_at ASC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_post_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_comment_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_saved_post(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hide_post_for_me(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_post_comment(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_post_repost(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_posts_engagement(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_post_comments(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_comment_replies(UUID, INTEGER, INTEGER) TO authenticated;

-- ---------- notification preferences for engagement types ----------
CREATE OR REPLACE FUNCTION public.notification_preference_column(p_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN p_type IN ('job_recommendation', 'new_job') THEN 'employment_new_jobs'
    WHEN p_type IN ('application_viewed', 'application_contacted', 'application_accepted', 'application_rejected') THEN 'employment_application_updates'
    WHEN p_type = 'new_application' THEN 'employment_new_applications'
    WHEN p_type IN ('new_follower', 'company_new_follower') THEN 'companies_new_followers'
    WHEN p_type IN ('verification_submitted', 'verification_approved', 'verification_rejected', 'company_verified', 'user_verified') THEN 'companies_verified'
    WHEN p_type IN (
      'new_post',
      'company_update',
      'post_like',
      'post_comment',
      'post_comment_reply',
      'comment_like',
      'post_repost'
    ) THEN 'activity_post_interactions'
    WHEN p_type IN ('new_message', 'conversation_update') THEN 'messages_new'
    WHEN p_type IN ('login', 'password_changed', 'security_alert', 'account_update') THEN 'account_security'
    WHEN p_type IN ('system_update', 'system_notification', 'system_alert', 'admin_notification', 'admin_broadcast') THEN 'system_updates'
    WHEN p_type IN ('marketing', 'promotional') THEN 'marketing_enabled'
    ELSE NULL
  END;
$$;

-- Allow create_notification for post engagement when actor owns the interaction
CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_notification public.notifications;
  v_application_id UUID;
  v_job_id UUID;
  v_post_id UUID;
  v_comment_id UUID;
  v_actor_id UUID;
  v_dedup_key TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM public.assert_rate_limit(auth.uid(), 'notification:create', 60, interval '1 hour');

  IF p_title IS NULL OR char_length(trim(p_title)) = 0 OR char_length(p_title) > 180 THEN
    RAISE EXCEPTION 'Invalid notification title';
  END IF;

  IF p_body IS NOT NULL AND char_length(p_body) > 1000 THEN
    RAISE EXCEPTION 'Invalid notification body';
  END IF;

  v_application_id := NULLIF(p_metadata->>'application_id', '')::UUID;
  v_job_id := NULLIF(p_metadata->>'job_id', '')::UUID;
  v_post_id := NULLIF(p_metadata->>'post_id', '')::UUID;
  v_comment_id := NULLIF(p_metadata->>'comment_id', '')::UUID;
  v_actor_id := coalesce(NULLIF(p_metadata->>'actor_id', '')::UUID, auth.uid());

  IF p_recipient_id = auth.uid() THEN
    NULL;
  ELSIF p_type = 'new_application' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.candidate_id = auth.uid()
        AND a.job_id = v_job_id
        AND j.company_id = p_recipient_id
    ) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSIF p_type IN ('application_viewed', 'application_contacted', 'application_accepted', 'application_rejected') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.id = v_application_id
        AND a.candidate_id = p_recipient_id
        AND j.company_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSIF p_type IN ('verification_approved', 'verification_rejected') THEN
    IF public.get_my_role() <> 'admin' THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSIF p_type = 'post_like' THEN
    IF v_actor_id <> auth.uid()
      OR v_post_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.post_likes pl
        WHERE pl.post_id = v_post_id AND pl.user_id = auth.uid()
      )
      OR NOT EXISTS (
        SELECT 1 FROM public.posts p
        WHERE p.id = v_post_id AND p.author_id = p_recipient_id
      )
    THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSIF p_type IN ('post_comment', 'post_comment_reply') THEN
    IF v_actor_id <> auth.uid()
      OR v_post_id IS NULL
      OR v_comment_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.post_comments c
        WHERE c.id = v_comment_id
          AND c.post_id = v_post_id
          AND c.author_id = auth.uid()
      )
    THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
    IF p_type = 'post_comment' AND NOT EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = v_post_id AND p.author_id = p_recipient_id
    ) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
    IF p_type = 'post_comment_reply' AND NOT EXISTS (
      SELECT 1 FROM public.post_comments parent
      JOIN public.post_comments child ON child.parent_id = parent.id
      WHERE child.id = v_comment_id
        AND parent.author_id = p_recipient_id
    ) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSIF p_type = 'comment_like' THEN
    IF v_actor_id <> auth.uid()
      OR v_comment_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.comment_likes cl
        WHERE cl.comment_id = v_comment_id AND cl.user_id = auth.uid()
      )
      OR NOT EXISTS (
        SELECT 1 FROM public.post_comments c
        WHERE c.id = v_comment_id AND c.author_id = p_recipient_id
      )
    THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSIF p_type = 'post_repost' THEN
    IF v_actor_id <> auth.uid()
      OR v_post_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.post_reposts pr
        WHERE pr.post_id = v_post_id AND pr.user_id = auth.uid()
      )
      OR NOT EXISTS (
        SELECT 1 FROM public.posts p
        WHERE p.id = v_post_id AND p.author_id = p_recipient_id
      )
    THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.user_allows_notification(p_recipient_id, p_type) THEN
    RETURN NULL;
  END IF;

  IF p_type IN ('post_like', 'post_comment', 'post_comment_reply', 'comment_like', 'post_repost') THEN
    v_dedup_key := md5(concat_ws(
      ':',
      p_recipient_id::TEXT,
      p_type,
      coalesce(v_post_id::TEXT, ''),
      coalesce(v_comment_id::TEXT, ''),
      auth.uid()::TEXT
    ));
  ELSE
    v_dedup_key := md5(concat_ws(
      ':',
      p_recipient_id::TEXT,
      p_type,
      coalesce(v_application_id::TEXT, ''),
      coalesce(v_job_id::TEXT, ''),
      coalesce(p_title, '')
    ));
  END IF;

  INSERT INTO public.notifications (recipient_id, type, title, body, metadata, dedup_key)
  VALUES (p_recipient_id, p_type, p_title, p_body, p_metadata, v_dedup_key)
  ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO UPDATE
  SET title = EXCLUDED.title,
      body = EXCLUDED.body,
      metadata = EXCLUDED.metadata,
      created_at = NOW(),
      read = FALSE
  RETURNING * INTO v_notification;

  RETURN v_notification;
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
