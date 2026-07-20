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

    // #region agent log
    fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4306af'},body:JSON.stringify({sessionId:'4306af',runId:'post-fix',hypothesisId:'E',location:'useConversations.js:fetch',message:'conversations refetch',data:{soft,prevCount:conversationsRef.current.length,nextCount:(data??[]).length,hadError:Boolean(fetchError),showSkeleton},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (fetchError) {
      setError(fetchError?.message ?? null);
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
