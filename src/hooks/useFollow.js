import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { followsService } from '../services/follows.service';
import { notificationsService } from '../services/notifications.service';

export function useFollow({ targetType, targetId, enabled = true }) {
  const { user, isAuthenticated } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !targetId) return;

    setLoading(true);

    const countPromise = followsService.getFollowerCount(targetType, targetId);
    const followPromise =
      isAuthenticated && user?.id
        ? followsService.isFollowing(user.id, targetType, targetId)
        : Promise.resolve({ data: null });

    const [countResult, followResult] = await Promise.all([countPromise, followPromise]);

    setFollowerCount(Number(countResult.data ?? 0));
    setIsFollowing(Boolean(followResult.data));
    setLoading(false);
  }, [enabled, targetId, targetType, isAuthenticated, user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleFollow = useCallback(async () => {
    if (!isAuthenticated || !user?.id || actionLoading) {
      return { ok: false, needsAuth: !isAuthenticated };
    }

    const wasFollowing = isFollowing;
    setActionLoading(true);
    setIsFollowing(!wasFollowing);
    setFollowerCount((count) => Math.max(0, count + (wasFollowing ? -1 : 1)));

    const { error } = wasFollowing
      ? await followsService.unfollow(user.id, targetType, targetId)
      : await followsService.follow(user.id, targetType, targetId);

    if (error) {
      setIsFollowing(wasFollowing);
      setFollowerCount((count) => Math.max(0, count + (wasFollowing ? 1 : -1)));
      setActionLoading(false);
      return { ok: false, error };
    }

    // In-app row is created by DB trigger; dispatch push for the followed account.
    if (!wasFollowing) {
      const link =
        targetType === 'organization' ? '/organization/profile' : '/business/profile';
      void notificationsService.sendPush({
        recipientIds: [targetId],
        title: 'Nuevo seguidor',
        body: 'Alguien empezó a seguir tu cuenta en TrabaGE.',
        data: {
          type: 'new_follower',
          follower_id: user.id,
          target_type: targetType,
          link,
        },
      });
    }

    setActionLoading(false);
    return { ok: true };
  }, [actionLoading, isAuthenticated, isFollowing, targetId, targetType, user?.id]);

  return {
    isFollowing,
    followerCount,
    loading,
    actionLoading,
    toggleFollow,
    refresh,
    canFollow: isAuthenticated && user?.id !== targetId,
  };
}
