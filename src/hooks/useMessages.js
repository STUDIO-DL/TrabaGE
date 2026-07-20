import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../config/supabase';
import { messagesService, MESSAGES_PAGE_SIZE } from '../services/messages.service';

function sortMessagesAscending(messages) {
  return [...messages].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id.localeCompare(b.id),
  );
}

export function useMessages(conversationId) {
  const { user, isPreviewMode } = useAuth();
  const [messages, setMessages] = useState([]);
  const [otherLastReadAt, setOtherLastReadAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [canSend, setCanSend] = useState(true);
  const [blockedReason, setBlockedReason] = useState(null);
  const cursorRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const markedReadRef = useRef(false);

  const cursorFromPage = (page) => {
    if (!page.length) return null;
    const last = page[page.length - 1];
    return { createdAt: last.created_at, id: last.id };
  };

  const syncParticipants = useCallback(async () => {
    if (!conversationId || !user?.id) return;

    const { data } = await messagesService.getConversationParticipants(conversationId);
    const other = (data ?? []).find((row) => row.user_id !== user.id);
    setOtherLastReadAt(other?.last_read_at ?? null);
  }, [conversationId, user?.id]);

  const syncSendState = useCallback(async () => {
    if (!conversationId || !user?.id || isPreviewMode) {
      setCanSend(true);
      setBlockedReason(null);
      return;
    }

    const { data } = await messagesService.getConversationSendState(conversationId);
    setCanSend(data?.canSend ?? true);
    setBlockedReason(data?.blockedReason ?? null);
  }, [conversationId, isPreviewMode, user?.id]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    if (isPreviewMode) {
      setMessages([]);
      setHasMore(false);
      setError(null);
      setCanSend(true);
      setBlockedReason(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    cursorRef.current = null;

    const [{ data: page, error: pageError }] = await Promise.all([
      messagesService.getMessages(conversationId, { cursor: null, limit: MESSAGES_PAGE_SIZE }),
      syncParticipants(),
      syncSendState(),
    ]);

    const rows = page ?? [];
    setMessages(sortMessagesAscending(rows));
    setHasMore(rows.length === MESSAGES_PAGE_SIZE);
    cursorRef.current = cursorFromPage(rows);
    setError(pageError?.message ?? null);
    setLoading(false);
  }, [conversationId, isPreviewMode, syncParticipants, syncSendState]);

  const loadMore = useCallback(async () => {
    if (!conversationId || isPreviewMode) return;
    if (loadingMoreRef.current || loading || !hasMore) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    const { data, error: pageError } = await messagesService.getMessages(conversationId, {
      cursor: cursorRef.current,
      limit: MESSAGES_PAGE_SIZE,
    });

    if (!pageError) {
      const page = data ?? [];
      setMessages((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return sortMessagesAscending([...page.filter((item) => !seen.has(item.id)), ...prev]);
      });
      if (page.length) cursorRef.current = cursorFromPage(page);
      setHasMore(page.length === MESSAGES_PAGE_SIZE);
    } else {
      setError(pageError.message ?? 'No se pudieron cargar más mensajes.');
    }

    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [conversationId, hasMore, isPreviewMode, loading]);

  const markRead = useCallback(async () => {
    if (!conversationId || isPreviewMode) return;
    await messagesService.markConversationRead(conversationId);
  }, [conversationId, isPreviewMode]);

  const sendMessage = useCallback(
    async (content) => {
      if (!conversationId || !user?.id || isPreviewMode) {
        return { error: { message: 'No se pudo enviar el mensaje.' } };
      }

      const trimmed = String(content ?? '').trim();
      if (!trimmed) return { error: { message: 'El mensaje no puede estar vacío.' } };

      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage = {
        id: optimisticId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: trimmed,
        created_at: new Date().toISOString(),
        optimistic: true,
      };

      setSending(true);
      setMessages((prev) => sortMessagesAscending([...prev, optimisticMessage]));

      const { data, error: sendError } = await messagesService.sendMessage(conversationId, trimmed);

      if (sendError) {
        setMessages((prev) => prev.filter((item) => item.id !== optimisticId));
        setSending(false);
        return { error: sendError };
      }

      setMessages((prev) =>
        sortMessagesAscending([
          ...prev.filter((item) => item.id !== optimisticId),
          data,
        ]),
      );
      await syncSendState();
      setSending(false);
      return { data, error: null };
    },
    [conversationId, isPreviewMode, syncSendState, user?.id],
  );

  useEffect(() => {
    markedReadRef.current = false;
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!conversationId || isPreviewMode || markedReadRef.current) return undefined;

    markedReadRef.current = true;
    void markRead();

    return undefined;
  }, [conversationId, isPreviewMode, markRead]);

  useEffect(() => {
    if (!conversationId || isPreviewMode) return undefined;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new;
          setMessages((prev) => {
            if (prev.some((item) => item.id === incoming.id)) return prev;
            return sortMessagesAscending([...prev, incoming]);
          });
          if (incoming.sender_id !== user?.id) {
            void markRead();
            void syncSendState();
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void syncParticipants();
        },
      )
      .subscribe();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void fetchMessages();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [conversationId, fetchMessages, isPreviewMode, markRead, syncParticipants, syncSendState, user?.id]);

  return {
    messages,
    otherLastReadAt,
    loading,
    loadingMore,
    hasMore,
    error,
    sending,
    canSend,
    blockedReason,
    sendMessage,
    loadMore,
    refetch: fetchMessages,
  };
}
