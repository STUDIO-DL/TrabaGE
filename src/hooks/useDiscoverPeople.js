import { useCallback, useEffect, useRef, useState } from 'react';
import { discoverService } from '../services/discover.service';

const PAGE_SIZE = 6;

export function useDiscoverPeople() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const seenIdsRef = useRef(new Set());

  const fetchPage = useCallback(async ({ append = false } = {}) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      seenIdsRef.current = new Set();
    }
    setError(null);

    try {
      const offset = append ? seenIdsRef.current.size : 0;
      const { data, error: fetchError } = await discoverService.getRecommendedPeople({
        limit: PAGE_SIZE,
        offset,
      });

      if (fetchError) {
        if (!append) setPeople([]);
        setError('No pudimos cargar esta información. Revisa tu conexión y prueba de nuevo.');
        setHasMore(false);
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      const unique = [];
      for (const row of rows) {
        const id = row?.user_id;
        if (!id || seenIdsRef.current.has(id)) continue;
        seenIdsRef.current.add(id);
        unique.push(row);
      }

      setPeople((prev) => (append ? [...prev, ...unique] : unique));
      setHasMore(rows.length >= PAGE_SIZE);
    } catch {
      if (!append) setPeople([]);
      setError('No pudimos cargar esta información. Revisa tu conexión y prueba de nuevo.');
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void fetchPage({ append: false });
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    void fetchPage({ append: true });
  }, [fetchPage, hasMore, loading, loadingMore]);

  const reload = useCallback(() => fetchPage({ append: false }), [fetchPage]);

  return { people, loading, loadingMore, hasMore, error, reload, loadMore };
}
