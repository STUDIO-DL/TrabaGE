import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../config/supabase';
import { messagesService } from '../services/messages.service';

export function useUnreadMessagesCount() {
  const { user, isPreviewMode } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(null);

  const fetchCount = useCallback(async () => {
    if (!user?.id) {
      setCount(0);
      setLoading(false);
      return;
    }

    if (isPreviewMode) {
      setCount(0);
      setLoading(false);
      return;
    }

    const { count: unreadCount } = await messagesService.getTotalUnreadCount(user.id);
    setCount(unreadCount ?? 0);
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

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchRef.current?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [isPreviewMode, user?.id]);

  return { count, loading, refetch: fetchCount };
}
