import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useForegroundResumeRefresh } from './useForegroundResumeRefresh';
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
  const activeConversationRef = useRef(conversationId);
  const sendingLockRef = useRef(false);
  activeConversationRef.current = conversationId;

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

    // #region agent log
    fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4306af'},body:JSON.stringify({sessionId:'4306af',runId:'post-fix',hypothesisId:'F',location:'useMessages.js:syncSendState',message:'send state applied',data:{requestedId,canSend:data?.canSend??null,hadError:Boolean(stateError)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

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

    // #region agent log
    fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4306af'},body:JSON.stringify({sessionId:'4306af',runId:'post-fix',hypothesisId:'C',location:'useMessages.js:fetchMessages',message:'fetch completed',data:{requestedId,activeId:activeConversationRef.current,stale:activeConversationRef.current!==requestedId,rowCount:(page??[]).length,pageError:Boolean(pageError)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (activeConversationRef.current !== requestedId) return;

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
      setError(pageError.message ?? 'No se pudieron cargar más mensajes.');
    }

    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, [conversationId, hasMore, isPreviewMode, loading]);

  const markRead = useCallback(async () => {
    if (!conversationId || isPreviewMode) return;
    await Promise.all([
      messagesService.markConversationRead(conversationId),
      messagesService.markMessageNotificationsRead(conversationId),
    ]);
  }, [conversationId, isPreviewMode]);

  const sendMessage = useCallback(
    async (content) => {
      if (!conversationId || !user?.id || isPreviewMode) {
        return { error: { message: 'No se pudo enviar el mensaje.' } };
      }

      if (sendingLockRef.current) {
        return { error: { message: 'Ya se está enviando un mensaje.' } };
      }

      const trimmed = String(content ?? '').trim();
      if (!trimmed) return { error: { message: 'El mensaje no puede estar vacío.' } };

      // #region agent log
      fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4306af'},body:JSON.stringify({sessionId:'4306af',runId:'post-fix',hypothesisId:'C',location:'useMessages.js:sendMessage:start',message:'send start',data:{conversationId,sendingLock:sendingLockRef.current},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage = {
        id: optimisticId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: trimmed,
        created_at: new Date().toISOString(),
        optimistic: true,
      };

      const sendConversationId = conversationId;
      sendingLockRef.current = true;
      setSending(true);
      setMessages((prev) => sortMessagesAscending([...prev, optimisticMessage]));

      const { data, error: sendError } = await messagesService.sendMessage(conversationId, trimmed);

      // #region agent log
      fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4306af'},body:JSON.stringify({sessionId:'4306af',runId:'post-fix',hypothesisId:'C',location:'useMessages.js:sendMessage:done',message:'send completed',data:{sendConversationId,activeId:activeConversationRef.current,stale:activeConversationRef.current!==sendConversationId,hasError:Boolean(sendError),serverMsgId:data?.id??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

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
        if (withoutOptimistic.some((item) => item.id === data.id)) {
          return sortMessagesAscending(withoutOptimistic);
        }
        return sortMessagesAscending([...withoutOptimistic, data]);
      });
      await syncSendState();
      sendingLockRef.current = false;
      setSending(false);
      return { data, error: null };
    },
    [conversationId, isPreviewMode, syncSendState, user?.id],
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
