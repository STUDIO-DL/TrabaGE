import { useCallback, useEffect, useRef, useState } from 'react';
import { postEngagementService } from '../data/postEngagement.service';
import { EMPTY_ENGAGEMENT } from '../domain/constants';
import { useAuth } from '../../../hooks/useAuth';
import { useNotificationContext } from '../../../context/NotificationContext';
import { notifyGuestBlocked } from '../../../utils/guestMode';
import { getSupabaseErrorMessage } from '../../../utils/supabaseErrors';
import { authorTypeFromRole } from '../../../constants/authorTypes';

function mergeEngagement(base, patch) {
  return { ...EMPTY_ENGAGEMENT, ...base, ...patch };
}

/**
 * Batch-loads engagement state for visible posts and exposes optimistic actions.
 */
export function usePostsEngagement(postIds = []) {
  const { user, isPreviewMode, role } = useAuth();
  const { showToast } = useNotificationContext();
  const [map, setMap] = useState({});
  const idsKey = postIds.filter(Boolean).sort().join(',');
  const loadingRef = useRef('');

  useEffect(() => {
    if (!idsKey) {
      setMap({});
      return undefined;
    }
    const ids = idsKey.split(',');
    let cancelled = false;
    loadingRef.current = idsKey;

    postEngagementService.getEngagementMap(ids).then(({ data, error }) => {
      if (cancelled || loadingRef.current !== idsKey) return;
      if (error) return;
      setMap((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          next[id] = mergeEngagement(prev[id], data[id]);
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const patch = useCallback((postId, updater) => {
    setMap((prev) => {
      const current = mergeEngagement(prev[postId], prev[postId]);
      const nextValue = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [postId]: mergeEngagement(current, nextValue) };
    });
  }, []);

  const requireAuth = useCallback(() => {
    if (isPreviewMode || !user) {
      notifyGuestBlocked(showToast);
      return false;
    }
    return true;
  }, [isPreviewMode, showToast, user]);

  const toggleLike = useCallback(
    async (post, actorLabel) => {
      if (!requireAuth() || !post?.id) return;
      const postId = post.id;
      const prev = mergeEngagement(map[postId], {
        likes_count: post.likes_count ?? map[postId]?.likes_count ?? 0,
      });
      const nextLiked = !prev.liked_by_me;
      patch(postId, {
        liked_by_me: nextLiked,
        likes_count: Math.max(0, (prev.likes_count || 0) + (nextLiked ? 1 : -1)),
      });

      const { data, error } = await postEngagementService.toggleLike(postId, {
        actorId: user.id,
        postAuthorId: post.author_id,
        actorLabel,
      });

      if (error) {
        patch(postId, prev);
        showToast(getSupabaseErrorMessage(error, 'No se pudo actualizar el Me gusta.'), 'error');
        return;
      }
      if (data) {
        patch(postId, {
          liked_by_me: data.liked,
          likes_count: data.likes_count,
        });
      }
    },
    [map, patch, requireAuth, showToast, user],
  );

  const toggleSave = useCallback(
    async (post) => {
      if (!requireAuth() || !post?.id) return;
      const postId = post.id;
      const prev = mergeEngagement(map[postId]);
      const nextSaved = !prev.saved_by_me;
      patch(postId, { saved_by_me: nextSaved });

      const { data, error } = await postEngagementService.toggleSave(postId);
      if (error) {
        patch(postId, prev);
        showToast(getSupabaseErrorMessage(error, 'No se pudo guardar la publicación.'), 'error');
        return;
      }
      patch(postId, { saved_by_me: Boolean(data?.saved) });
      showToast(data?.saved ? 'Publicación guardada.' : 'Publicación eliminada de Guardados.', 'success');
    },
    [map, patch, requireAuth, showToast],
  );

  const hidePost = useCallback(
    async (post) => {
      if (!requireAuth() || !post?.id) return false;
      const { error } = await postEngagementService.hidePost(post.id);
      if (error) {
        showToast(getSupabaseErrorMessage(error, 'No se pudo ocultar la publicación.'), 'error');
        return false;
      }
      patch(post.id, { hidden_by_me: true });
      showToast('Publicación ocultada.', 'success');
      return true;
    },
    [patch, requireAuth, showToast],
  );

  const createRepost = useCallback(
    async (post, commentary = null, actorLabel) => {
      if (!requireAuth() || !post?.id) return { ok: false };
      const postId = post.id;
      const prev = mergeEngagement(map[postId], {
        reposts_count: post.reposts_count ?? map[postId]?.reposts_count ?? 0,
      });
      if (prev.reposted_by_me) {
        showToast('Ya compartiste esta publicación.', 'info');
        return { ok: false };
      }
      if (post.author_id === user.id) {
        showToast('No puedes compartir tu propia publicación.', 'info');
        return { ok: false };
      }

      patch(postId, {
        reposted_by_me: true,
        reposts_count: (prev.reposts_count || 0) + 1,
      });

      const { data, error } = await postEngagementService.createRepost({
        postId,
        commentary,
        authorType: authorTypeFromRole(role),
        actorId: user.id,
        postAuthorId: post.author_id,
        actorLabel,
      });

      if (error) {
        patch(postId, prev);
        showToast(getSupabaseErrorMessage(error, 'No se pudo compartir la publicación.'), 'error');
        return { ok: false };
      }

      if (data?.reposts_count != null) {
        patch(postId, { reposts_count: data.reposts_count, reposted_by_me: true });
      }
      showToast('Publicación compartida en TrabaGE.', 'success');
      return { ok: true, data };
    },
    [map, patch, requireAuth, role, showToast, user],
  );

  const bumpComments = useCallback(
    (postId, delta = 1) => {
      patch(postId, (current) => ({
        comments_count: Math.max(0, (current.comments_count || 0) + delta),
      }));
    },
    [patch],
  );

  const getEngagement = useCallback(
    (post) =>
      mergeEngagement(
        {
          likes_count: post?.likes_count ?? 0,
          comments_count: post?.comments_count ?? 0,
          reposts_count: post?.reposts_count ?? 0,
        },
        map[post?.id],
      ),
    [map],
  );

  return {
    getEngagement,
    engagementByPostId: map,
    toggleLike,
    toggleSave,
    hidePost,
    createRepost,
    bumpComments,
  };
}
