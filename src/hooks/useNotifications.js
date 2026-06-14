import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { notificationsService } from '../services/notifications.service';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    const [listResult, countResult] = await Promise.all([
      notificationsService.getAll(user.id),
      notificationsService.getUnreadCount(user.id),
    ]);

    setNotifications(listResult.data ?? []);
    setUnreadCount(countResult.count ?? 0);
    setError(listResult.error?.message ?? null);
    setLoading(false);
  }, [user?.id]);

  const markAsRead = useCallback(
    async (id) => {
      await notificationsService.markAsRead(id);
      fetchNotifications();
    },
    [fetchNotifications],
  );

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    await notificationsService.markAllAsRead(user.id);
    fetchNotifications();
  }, [user?.id, fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
