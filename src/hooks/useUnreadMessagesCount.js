import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useForegroundResumeRefresh } from './useForegroundResumeRefresh';
import { supabase } from '../config/supabase';
import { messagesService } from '../services/messages.service';
import { syncAppBadge } from '../utils/appBadge';

export function useUnreadMessagesCount() {
  const { user, isPreviewMode } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(null);

  const fetchCount = useCallback(async () => {
    if (!user?.id) {
      setCount(0);
      syncAppBadge(0);
      setLoading(false);
      return;
    }

    if (isPreviewMode) {
      setCount(0);
      syncAppBadge(0);
      setLoading(false);
      return;
    }

    const { count: unreadCount, error } = await messagesService.getTotalUnreadCount(user.id);
    if (error) {
      setLoading(false);
      return;
    }
    const nextCount = unreadCount ?? 0;
    setCount(nextCount);
    syncAppBadge(nextCount);
    setLoading(false);
  }, [isPreviewMode, user?.id]);

  fetchRef.current = fetchCount;

  useEffect(() => {
    setLoading(true);
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    if (!user?.id || isPreviewMode) return undefined;

    const channel = supabase
      .channel(`messages-unread-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchRef.current?.(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversation_participants' },
        () => fetchRef.current?.(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isPreviewMode, user?.id]);

  useForegroundResumeRefresh(() => fetchRef.current?.(), [fetchCount]);

  return { count, loading, refetch: fetchCount };
}
