import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MESSAGE_SEARCH_PAGE_SIZE,
  messagesService,
} from '../services/messages.service';
import { getUserErrorMessage, ERROR_ACTION } from '../utils/userFacingError';
import { reportError } from '../utils/logger';

const DEBOUNCE_MS = 300;

/**
 * Debounced in-conversation message search (server RPC).
 */
export function useConversationMessageSearch(conversationId, query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const requestIdRef = useRef(0);
  const cursorRef = useRef(null);

  const trimmed = String(query ?? '').trim();
  const isSearching = Boolean(conversationId) && trimmed.length > 0;

  useEffect(() => {
    if (!isSearching) {
      requestIdRef.current += 1;
      setResults([]);
      setLoading(false);
      setLoadingMore(false);
      setError(null);
      setHasMore(false);
      cursorRef.current = null;
      return undefined;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    cursorRef.current = null;

    const timer = window.setTimeout(async () => {
      const { data, error: searchError, hasMore: more } =
        await messagesService.searchConversationMessages(conversationId, trimmed, {
          limit: MESSAGE_SEARCH_PAGE_SIZE,
          cursor: null,
        });

      if (requestId !== requestIdRef.current) return;

      if (searchError) {
        reportError(searchError, { area: 'search_conversation_messages', conversationId });
        setResults([]);
        setHasMore(false);
        setError(getUserErrorMessage(searchError, ERROR_ACTION.search));
        setLoading(false);
        return;
      }

      const last = data[data.length - 1];
      cursorRef.current = last
        ? { createdAt: last.createdAt, id: last.id }
        : null;
      setResults(data);
      setHasMore(Boolean(more));
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [conversationId, trimmed, isSearching]);

  const loadMore = useCallback(async () => {
    if (!isSearching || loading || loadingMore || !hasMore || !cursorRef.current) return;

    setLoadingMore(true);
    const requestId = requestIdRef.current;
    const { data, error: searchError, hasMore: more } =
      await messagesService.searchConversationMessages(conversationId, trimmed, {
        limit: MESSAGE_SEARCH_PAGE_SIZE,
        cursor: cursorRef.current,
      });

    if (requestId !== requestIdRef.current) {
      setLoadingMore(false);
      return;
    }

    if (searchError) {
      reportError(searchError, { area: 'search_conversation_messages_more', conversationId });
      setError(getUserErrorMessage(searchError, ERROR_ACTION.search));
      setLoadingMore(false);
      return;
    }

    const last = data[data.length - 1];
    if (last) cursorRef.current = { createdAt: last.createdAt, id: last.id };
    setResults((prev) => [...prev, ...data]);
    setHasMore(Boolean(more));
    setLoadingMore(false);
  }, [conversationId, hasMore, isSearching, loading, loadingMore, trimmed]);

  return {
    isSearching,
    results,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
  };
}
