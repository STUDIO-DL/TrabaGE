import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useForegroundResumeRefresh } from './useForegroundResumeRefresh';
import { supabase } from '../config/supabase';
import { messagesService } from '../services/messages.service';
import { getUserErrorMessage, ERROR_ACTION } from '../utils/userFacingError';
import { subscribeConversationRead } from '../utils/conversationUnreadEvents';

export function useConversations() {
  const { user, isPreviewMode } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchRef = useRef(null);
  const conversationsRef = useRef([]);
  conversationsRef.current = conversations;

  const fetchConversations = useCallback(async ({ soft = false } = {}) => {
    if (!user?.id) return;

    if (isPreviewMode) {
      setConversations([]);
      setError(null);
      setLoading(false);
      return;
    }

    const hasExisting = conversationsRef.current.length > 0;
    const showSkeleton = !soft && !hasExisting;
    if (showSkeleton) setLoading(true);
    if (!soft) setError(null);

    const { data, error: fetchError } = await messagesService.getConversations(user.id);


    if (fetchError) {
      setError(fetchError ? getUserErrorMessage(fetchError, ERROR_ACTION.load_messages) : null);
      // Keep previous list on soft/realtime refresh failures.
      if (!hasExisting) setConversations([]);
      setLoading(false);
      return;
    }

    setConversations(data ?? []);
    setError(null);
    setLoading(false);
  }, [isPreviewMode, user?.id]);

  fetchRef.current = fetchConversations;

  useEffect(() => {
    fetchConversations({ soft: false });
  }, [fetchConversations]);

  useEffect(() => {
    return subscribeConversationRead((conversationId) => {
      setConversations((prev) =>
        prev.map((item) =>
          item.id === conversationId && (item.unreadCount ?? 0) > 0
            ? { ...item, unreadCount: 0 }
            : item,
        ),
      );
    });
  }, []);

  useEffect(() => {
    if (!user?.id || isPreviewMode) return undefined;

    const channel = supabase
      .channel(`conversations-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchRef.current?.({ soft: true }),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversation_participants' },
        () => fetchRef.current?.({ soft: true }),
      )
      .on(
        'postgres_changes',
        { event: ['INSERT', 'UPDATE'], schema: 'public', table: 'candidate_profiles' },
        () => fetchRef.current?.({ soft: true }),
      )
      .on(
        'postgres_changes',
        { event: ['INSERT', 'UPDATE'], schema: 'public', table: 'company_profiles' },
        () => fetchRef.current?.({ soft: true }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isPreviewMode, user?.id]);

  useForegroundResumeRefresh(() => fetchRef.current?.({ soft: true }), [fetchConversations]);

  const totalUnread = conversations.reduce((sum, item) => sum + (item.unreadCount ?? 0), 0);

  return {
    conversations,
    totalUnread,
    loading,
    error,
    refetch: () => fetchConversations({ soft: false }),
  };
}
