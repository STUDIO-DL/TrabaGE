import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useForegroundResumeRefresh } from './useForegroundResumeRefresh';
import { supabase } from '../config/supabase';
import { messagesService } from '../services/messages.service';

export function useConversations() {
  const { user, isPreviewMode } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    if (isPreviewMode) {
      setConversations([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await messagesService.getConversations(user.id);
    setConversations(data ?? []);
    setError(fetchError?.message ?? null);
    setLoading(false);
  }, [isPreviewMode, user?.id]);

  fetchRef.current = fetchConversations;

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!user?.id || isPreviewMode) return undefined;

    const channel = supabase
      .channel(`conversations-${user.id}`)
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

  useForegroundResumeRefresh(() => fetchRef.current?.(), [fetchConversations]);

  const totalUnread = conversations.reduce((sum, item) => sum + (item.unreadCount ?? 0), 0);

  return {
    conversations,
    totalUnread,
    loading,
    error,
    refetch: fetchConversations,
  };
}
