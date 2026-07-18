import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import {
  notificationsService,
  NOTIFICATIONS_PAGE_SIZE,
} from '../services/notifications.service';

export function useNotifications() {
  const { user, isPreviewMode } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  // Keyset cursor: { createdAt, id } of the last loaded notification, or null
  // for the first page. Tracks the fetch boundary (not a count of displayed
  // items), so local/server deletions never corrupt the next-page window.
  const cursorRef = useRef(null);
  const loadingMoreRef = useRef(false);

  const cursorFromPage = (page) => {
    if (!page.length) return null;
    const last = page[page.length - 1];
    return { createdAt: last.created_at, id: last.id };
  };

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    if (isPreviewMode) {
      setNotifications([]);
      setUnreadCount(0);
      setHasMore(false);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    cursorRef.current = null;

    const [listResult, countResult] = await Promise.all([
      notificationsService.getPage(user.id, { cursor: null, limit: NOTIFICATIONS_PAGE_SIZE }),
      notificationsService.getUnreadCount(user.id),
    ]);

    const page = listResult.data ?? [];
    setNotifications(page);
    setUnreadCount(countResult.count ?? 0);
    setHasMore(page.length === NOTIFICATIONS_PAGE_SIZE);
    cursorRef.current = cursorFromPage(page);
    setError(listResult.error?.message ?? null);
    setLoading(false);
  }, [user?.id, isPreviewMode]);

  const loadMore = useCallback(async () => {
    if (!user?.id || isPreviewMode) return;
    if (loadingMoreRef.current || loading || !hasMore) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    const { data, error: pageError } = await notificationsService.getPage(user.id, {
      cursor: cursorRef.current,
      limit: NOTIFICATIONS_PAGE_SIZE,
    });

    if (!pageError) {
      const page = data ?? [];
      setNotifications((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...page.filter((n) => !seen.has(n.id))];
      });
      if (page.length) cursorRef.current = cursorFromPage(page);
      setHasMore(page.length === NOTIFICATIONS_PAGE_SIZE);
    } else {
      setError(pageError.message ?? 'No se pudieron cargar más notificaciones.');
    }

    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [user?.id, isPreviewMode, loading, hasMore]);

  const markAsRead = useCallback(async (id) => {
    // Optimistic local update — avoids re-fetching the whole list.
    let wasUnread = false;
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id && !n.read) wasUnread = true;
        return n.id === id ? { ...n, read: true } : n;
      }),
    );
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    await notificationsService.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await notificationsService.markAllAsRead(user.id);
  }, [user?.id]);

  const deleteNotification = useCallback(async (id) => {
    // Optimistic removal with rollback on failure.
    let removed = null;
    setNotifications((prev) => {
      removed = prev.find((n) => n.id === id) ?? null;
      return prev.filter((n) => n.id !== id);
    });
    if (removed && !removed.read) setUnreadCount((c) => Math.max(0, c - 1));
    // NOTE: intentionally do NOT touch the pagination cursor here. The cursor is
    // anchored to the (created_at, id) of the last loaded row, so a local delete
    // does not affect where the next page starts. Even if the deleted row was
    // the cursor row itself, `created_at < cursor` still selects the correct
    // subsequent rows.

    const { error: deleteError } = await notificationsService.delete(id);

    if (deleteError && removed) {
      setNotifications((prev) =>
        [...prev, removed].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        ),
      );
      if (!removed.read) setUnreadCount((c) => c + 1);
      return {
        error: { ...deleteError, message: 'No se pudo eliminar la notificación.' },
      };
    }

    return { error: null };
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    refetch: fetchNotifications,
  };
}
