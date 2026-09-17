-- 149: Post recommendation notifications ("Este post podría interesarte")
-- + map post_recommendation to activity_post_interactions.

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
      'post_recommendation',
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

CREATE OR REPLACE FUNCTION public.notify_post_recommendations(p_post_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_post public.posts;
  v_preview TEXT;
  v_title TEXT := 'Este post podría interesarte';
  v_body TEXT;
  v_link TEXT;
  v_recipient_ids UUID[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_post
  FROM public.posts
  WHERE id = p_post_id;

  IF v_post.id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF v_post.author_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF coalesce(v_post.is_hidden, false) THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  PERFORM public.assert_rate_limit(auth.uid(), 'notification:post_recommendation', 30, interval '1 hour');

  v_preview := left(trim(coalesce(v_post.content, '')), 120);
  IF v_preview IS NULL OR char_length(v_preview) = 0 THEN
    v_body := 'Hay una publicación nueva en TrabaGE.';
  ELSE
    v_body := v_preview;
  END IF;
  v_link := '/post/' || v_post.id::TEXT;

  WITH
  post_topic_ids AS (
    SELECT pt.topic_id
    FROM public.post_topics pt
    JOIN public.topics t ON t.id = pt.topic_id
    WHERE pt.post_id = v_post.id
      AND coalesce(t.is_active, false) = TRUE
      AND t.slug IS DISTINCT FROM 'todos'
  ),
  followers AS (
    SELECT f.user_id, 0 AS priority
    FROM public.follows f
    WHERE f.target_id = v_post.author_id
  ),
  topic_fans AS (
    SELECT DISTINCT pl.user_id, 1 AS priority
    FROM public.post_likes pl
    JOIN public.post_topics pt ON pt.post_id = pl.post_id
    WHERE pt.topic_id IN (SELECT topic_id FROM post_topic_ids)
      AND pl.created_at > now() - interval '30 days'
      AND pl.user_id IS DISTINCT FROM v_post.author_id
  ),
  sector_matches AS (
    SELECT cp.user_id, 2 AS priority
    FROM public.candidate_profiles cp
    WHERE cp.user_id IS DISTINCT FROM v_post.author_id
      AND char_length(trim(coalesce(cp.sector, ''))) >= 4
      AND (
        lower(coalesce(v_post.content, '')) LIKE '%' || lower(trim(cp.sector)) || '%'
        OR lower(coalesce(v_post.category, '')) LIKE '%' || lower(trim(cp.sector)) || '%'
      )
  ),
  keyword_matches AS (
    SELECT cp.user_id, 2 AS priority
    FROM public.candidate_profiles cp
    WHERE cp.user_id IS DISTINCT FROM v_post.author_id
      AND jsonb_typeof(coalesce(cp.job_preferences -> 'keywords', '[]'::jsonb)) = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(coalesce(cp.job_preferences -> 'keywords', '[]'::jsonb)) kw
        WHERE char_length(trim(kw)) >= 3
          AND lower(coalesce(v_post.content, '')) LIKE '%' || lower(trim(kw)) || '%'
      )
  ),
  ranked AS (
    SELECT x.user_id, MIN(x.priority) AS priority
    FROM (
      SELECT * FROM followers
      UNION ALL
      SELECT * FROM topic_fans
      UNION ALL
      SELECT * FROM sector_matches
      UNION ALL
      SELECT * FROM keyword_matches
    ) x
    WHERE public.is_public_app_user(x.user_id)
      AND public.user_allows_notification(x.user_id, 'post_recommendation')
    GROUP BY x.user_id
    ORDER BY MIN(x.priority), x.user_id
    LIMIT 80
  ),
  inserted AS (
    INSERT INTO public.notifications (recipient_id, type, title, body, metadata, dedup_key)
    SELECT
      r.user_id,
      'post_recommendation',
      v_title,
      v_body,
      jsonb_build_object(
        'link', v_link,
        'post_id', v_post.id,
        'actor_id', v_post.author_id,
        'target_type', 'post',
        'target_id', v_post.id
      ),
      'post_recommendation:' || r.user_id::TEXT || ':' || v_post.id::TEXT
    FROM ranked r
    ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
    RETURNING recipient_id
  )
  SELECT COALESCE(ARRAY_AGG(recipient_id), ARRAY[]::UUID[])
  INTO v_recipient_ids
  FROM inserted;

  RETURN COALESCE(v_recipient_ids, ARRAY[]::UUID[]);
END;
$$;

REVOKE ALL ON FUNCTION public.notify_post_recommendations(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_post_recommendations(UUID) TO authenticated;

COMMENT ON FUNCTION public.notify_post_recommendations(UUID) IS
  'Creates in-app post_recommendation rows for followers and users likely interested in the post. Returns recipient ids for Web Push.';

NOTIFY pgrst, 'reload schema';
