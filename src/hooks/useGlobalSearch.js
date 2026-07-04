import { useEffect, useRef, useState } from 'react';
import { searchService } from '../services/search.service';
import { useAuth } from './useAuth';
import { reportError } from '../utils/logger';

const DEBOUNCE_MS = 300;

export function useGlobalSearch(query, { enabled = true, limitPerType = 5 } = {}) {
  const { user, role } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query?.trim() ?? '';

    if (!enabled || !trimmed) {
      setResults([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      const { data, error: searchError } = await searchService.globalSearch({
        query: trimmed,
        limitPerType,
        user: user ? { id: user.id, role } : null,
      });

      if (requestIdRef.current !== requestId) return;

      if (searchError) {
        reportError(searchError, { area: 'global_search', query: trimmed });
        setError(searchError);
        setResults([]);
      } else {
        setResults(data || []);
        setError(null);
      }
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, enabled, limitPerType, user, role]);

  return { results, loading, error };
}
