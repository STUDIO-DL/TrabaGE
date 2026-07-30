import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MESSAGE_SEARCH_PAGE_SIZE,
  messagesService,
} from '../services/messages.service';
import { getUserErrorMessage, ERROR_ACTION } from '../utils/userFacingError';
import { reportError } from '../utils/logger';

const DEBOUNCE_MS = 300;

/**
 * Debounced server search for the conversations inbox.
 * Empty query → inactive (caller shows full realtime list).
 */
export function useConversationSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [activeQuery, setActiveQuery] = useState('');
  const requestIdRef = useRef(0);
  const offsetRef = useRef(0);

  const trimmed = String(query ?? '').trim();
  const isSearching = trimmed.length > 0;

  useEffect(() => {
    if (!isSearching) {
      requestIdRef.current += 1;
      setResults([]);
      setLoading(false);
      setLoadingMore(false);
      setError(null);
      setHasMore(false);
      setActiveQuery('');
      offsetRef.current = 0;
      return undefined;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      const { data, error: searchError, hasMore: more } = await messagesService.searchConversations(
        trimmed,
        { limit: MESSAGE_SEARCH_PAGE_SIZE, offset: 0 },
      );

      if (requestId !== requestIdRef.current) return;

      if (searchError) {
        reportError(searchError, { area: 'search_conversations' });
        setResults([]);
        setHasMore(false);
        setError(getUserErrorMessage(searchError, ERROR_ACTION.search));
        setLoading(false);
        return;
      }

      offsetRef.current = data.length;
      setResults(data);
      setHasMore(Boolean(more));
      setActiveQuery(trimmed);
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [trimmed, isSearching]);

  const loadMore = useCallback(async () => {
    if (!isSearching || loading || loadingMore || !hasMore) return;

    setLoadingMore(true);
    const requestId = requestIdRef.current;
    const { data, error: searchError, hasMore: more } = await messagesService.searchConversations(
      trimmed,
      { limit: MESSAGE_SEARCH_PAGE_SIZE, offset: offsetRef.current },
    );

    if (requestId !== requestIdRef.current) {
      setLoadingMore(false);
      return;
    }

    if (searchError) {
      reportError(searchError, { area: 'search_conversations_more' });
      setError(getUserErrorMessage(searchError, ERROR_ACTION.search));
      setLoadingMore(false);
      return;
    }

    offsetRef.current += data.length;
    setResults((prev) => [...prev, ...data]);
    setHasMore(Boolean(more));
    setLoadingMore(false);
  }, [hasMore, isSearching, loading, loadingMore, trimmed]);

  return {
    isSearching,
    activeQuery,
    results,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
  };
}
