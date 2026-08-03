import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useForegroundResumeRefresh } from './useForegroundResumeRefresh';
import { supabase } from '../config/supabase';
import { messagesService, MESSAGES_PAGE_SIZE } from '../services/messages.service';
import { getUserErrorMessage, ERROR_ACTION } from '../utils/userFacingError';
import { emitConversationRead } from '../utils/conversationUnreadEvents';
import { computeMessageExpiresAt, isMessageActive } from '../constants/messageTtl';

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
  const activeConversationRef = useRef(conversationId);
  const sendingLockRef = useRef(false);
  const messagesRef = useRef([]);
  activeConversationRef.current = conversationId;
  messagesRef.current = messages;

  const cursorFromPage = (page) => {
    if (!page.length) return null;
    const last = page[page.length - 1];
    return { createdAt: last.created_at, id: last.id };
  };

  const syncParticipants = useCallback(async () => {
    if (!conversationId || !user?.id) return;

    const requestedId = conversationId;
    const { data } = await messagesService.getConversationParticipants(conversationId);
    if (activeConversationRef.current !== requestedId) return;
    const other = (data ?? []).find((row) => row.user_id !== user.id);
    setOtherLastReadAt(other?.last_read_at ?? null);
  }, [conversationId, user?.id]);

  const syncSendState = useCallback(async () => {
    if (!conversationId || !user?.id || isPreviewMode) {
      setCanSend(true);
      setBlockedReason(null);
      return;
    }

    const requestedId = conversationId;
    const { data, error: stateError } = await messagesService.getConversationSendState(conversationId);
    if (activeConversationRef.current !== requestedId) return;

    if (stateError) {
      setCanSend(false);
      setBlockedReason(data?.blockedReason ?? 'No se pudo verificar si puedes enviar mensajes.');
      return;
    }

    setCanSend(Boolean(data?.canSend));
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

    const requestedId = conversationId;
    setLoading(true);
    setError(null);
    cursorRef.current = null;

    const [{ data: page, error: pageError }] = await Promise.all([
      messagesService.getMessages(conversationId, { cursor: null, limit: MESSAGES_PAGE_SIZE }),
      syncParticipants(),
      syncSendState(),
    ]);

    if (activeConversationRef.current !== requestedId) return;

    const rows = page ?? [];
    setMessages(sortMessagesAscending(rows));
    setHasMore(rows.length === MESSAGES_PAGE_SIZE);
    cursorRef.current = cursorFromPage(rows);
    setError(pageError ? getUserErrorMessage(pageError, ERROR_ACTION.load_messages) : null);
    setLoading(false);
  }, [conversationId, isPreviewMode, syncParticipants, syncSendState]);

  const loadMore = useCallback(async () => {
    if (!conversationId || isPreviewMode) return;
    if (loadingMoreRef.current || loading || !hasMore) return;

    const requestedId = conversationId;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    const { data, error: pageError } = await messagesService.getMessages(conversationId, {
      cursor: cursorRef.current,
      limit: MESSAGES_PAGE_SIZE,
    });

    if (activeConversationRef.current !== requestedId) {
      loadingMoreRef.current = false;
      setLoadingMore(false);
      return;
    }

    if (!pageError) {
      const page = data ?? [];
      setMessages((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return sortMessagesAscending([...page.filter((item) => !seen.has(item.id)), ...prev]);
      });
      if (page.length) cursorRef.current = cursorFromPage(page);
      setHasMore(page.length === MESSAGES_PAGE_SIZE);
    } else {
      setError(getUserErrorMessage(pageError, ERROR_ACTION.load_messages));
    }

    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [conversationId, hasMore, isPreviewMode, loading]);

  /**
   * Ensure a message is in the local window (for jump-to-search).
   * @returns {'ok'|'missing'|'error'}
   */
  const ensureMessageLoaded = useCallback(
    async (messageId) => {
      if (!conversationId || !messageId || isPreviewMode) return 'error';

      const already = messagesRef.current.some((item) => item.id === messageId);
      if (already) return 'ok';

      const requestedId = conversationId;
      const { data, error: windowError, found } = await messagesService.getMessagesAround(
        conversationId,
        messageId,
        { before: MESSAGES_PAGE_SIZE, after: 12 },
      );

      if (activeConversationRef.current !== requestedId) return 'error';

      if (windowError) {
        setError(getUserErrorMessage(windowError, ERROR_ACTION.load_messages));
        return 'error';
      }

      if (!found || !data.length) return 'missing';

      setMessages((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const merged = [...prev];
        for (const row of data) {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            merged.push(row);
          }
        }
        return sortMessagesAscending(merged);
      });

      // Allow loading still-older history from the oldest loaded row
      const ascending = sortMessagesAscending(data);
      if (ascending.length) {
        cursorRef.current = {
          createdAt: ascending[0].created_at,
          id: ascending[0].id,
        };
        setHasMore(true);
      }

      return 'ok';
    },
    [conversationId, isPreviewMode],
  );

  const markRead = useCallback(async () => {
    if (!conversationId || isPreviewMode) return;
    emitConversationRead(conversationId);
    await Promise.all([
      messagesService.markConversationRead(conversationId),
      messagesService.markMessageNotificationsRead(conversationId),
    ]);
  }, [conversationId, isPreviewMode]);

  const sendMessage = useCallback(
    async (content, { replyToMessageId = null, replyTo = null } = {}) => {
      if (!conversationId || !user?.id || isPreviewMode) {
        return { error: { message: 'No se pudo enviar el mensaje.' } };
      }

      if (sendingLockRef.current) {
        return { error: { message: 'Ya se está enviando un mensaje.' } };
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
        expires_at: computeMessageExpiresAt(),
        optimistic: true,
        reply_to_message_id: replyToMessageId || null,
        reply_to: replyTo || null,
      };

      const sendConversationId = conversationId;
      sendingLockRef.current = true;
      setSending(true);
      setMessages((prev) => sortMessagesAscending([...prev, optimisticMessage]));

      const { data, error: sendError } = await messagesService.sendMessage(conversationId, trimmed, {
        replyToMessageId,
      });

      if (activeConversationRef.current !== sendConversationId) {
        sendingLockRef.current = false;
        setSending(false);
        return sendError ? { error: sendError } : { data, error: null };
      }

      if (sendError) {
        setMessages((prev) => prev.filter((item) => item.id !== optimisticId));
        sendingLockRef.current = false;
        setSending(false);
        return { error: sendError };
      }

      setMessages((prev) => {
        const withoutOptimistic = prev.filter((item) => item.id !== optimisticId);
        const serverRow =
          data?.reply_to || !replyTo
            ? data
            : { ...data, reply_to: data?.reply_to ?? replyTo };
        if (withoutOptimistic.some((item) => item.id === serverRow.id)) {
          return sortMessagesAscending(withoutOptimistic);
        }
        return sortMessagesAscending([...withoutOptimistic, serverRow]);
      });
      await syncSendState();
      sendingLockRef.current = false;
      setSending(false);
      return { data, error: null };
    },
    [conversationId, isPreviewMode, syncSendState, user?.id],
  );

  const deleteMessage = useCallback(
    async (messageId) => {
      if (!conversationId || !user?.id || isPreviewMode || !messageId) {
        return { error: { message: 'No se pudo eliminar el mensaje.' } };
      }

      const target = messagesRef.current.find((item) => item.id === messageId);
      if (!target || target.sender_id !== user.id) {
        return { error: { message: 'Solo puedes eliminar tus propios mensajes.' } };
      }

      // Optimistic remove
      setMessages((prev) => prev.filter((item) => item.id !== messageId));

      const { data, error: deleteError } = await messagesService.softDeleteOwnMessage(messageId);

      if (deleteError) {
        // Restore on failure
        setMessages((prev) => {
          if (prev.some((item) => item.id === messageId)) return prev;
          return sortMessagesAscending([...prev, target]);
        });
        return { error: deleteError };
      }

      return { data, error: null };
    },
    [conversationId, isPreviewMode, user?.id],
  );

  useEffect(() => {
    markedReadRef.current = false;
    sendingLockRef.current = false;
    setSending(false);
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

    let heartbeatId = null;

    const syncPresence = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void messagesService.upsertConversationActiveView(conversationId);
    };

    syncPresence();
    heartbeatId = window.setInterval(syncPresence, 30_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncPresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (heartbeatId != null) window.clearInterval(heartbeatId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void messagesService.clearConversationActiveView(conversationId);
    };
  }, [conversationId, isPreviewMode]);

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
          if (!isMessageActive(incoming)) return;
          setMessages((prev) => {
            if (prev.some((item) => item.id === incoming.id)) return prev;
            return sortMessagesAscending([...prev, incoming]);
          });
          // Sync lock for both parties (incl. multi-tab own sends).
          void syncSendState();
          if (incoming.sender_id !== user?.id) {
            void markRead();
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new;
          if (!updated?.id) return;
          if (!isMessageActive(updated)) {
            setMessages((prev) => prev.filter((item) => item.id !== updated.id));
            return;
          }
          setMessages((prev) => {
            const index = prev.findIndex((item) => item.id === updated.id);
            if (index < 0) return prev;
            const next = [...prev];
            next[index] = { ...next[index], ...updated };
            return next;
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const removedId = payload.old?.id;
          if (!removedId) return;
          setMessages((prev) => prev.filter((item) => item.id !== removedId));
          void syncSendState();
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, isPreviewMode, markRead, syncParticipants, syncSendState, user?.id]);

  useForegroundResumeRefresh(() => {
    void fetchMessages();
  }, [fetchMessages]);

  // Prune locally when TTL elapses (no DB UPDATE fires at expires_at).
  useEffect(() => {
    if (!conversationId || isPreviewMode) return undefined;

    const prune = () => {
      setMessages((prev) => {
        const next = prev.filter((item) => item.optimistic || isMessageActive(item));
        return next.length === prev.length ? prev : next;
      });
    };

    prune();
    const timer = window.setInterval(prune, 60_000);
    return () => window.clearInterval(timer);
  }, [conversationId, isPreviewMode]);

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
    deleteMessage,
    loadMore,
    ensureMessageLoaded,
    refetch: fetchMessages,
  };
}
