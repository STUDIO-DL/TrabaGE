-- =============================================
-- 044_day8_production_indexes.sql
-- Production indexes for high-frequency reads.
-- =============================================

CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON public.notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_unread_recipient_idx
  ON public.notifications (recipient_id)
  WHERE read = false;

CREATE INDEX IF NOT EXISTS applications_candidate_applied_idx
  ON public.applications (candidate_id, applied_at DESC);

CREATE INDEX IF NOT EXISTS posts_visible_created_idx
  ON public.posts (created_at DESC)
  WHERE coalesce(is_hidden, false) = false;

CREATE INDEX IF NOT EXISTS user_roles_role_idx
  ON public.user_roles (role);
