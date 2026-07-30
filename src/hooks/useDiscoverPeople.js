import { useCallback, useEffect, useRef, useState } from 'react';
import { discoverService } from '../services/discover.service';
import {
  DISCOVER_PEOPLE_NETWORK_DESCRIPTION,
  DISCOVER_PEOPLE_NETWORK_TITLE,
} from '../constants/emptyContent';

const PAGE_SIZE = 6;

function isNetworkLikeError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  const name = String(error?.name || '').toLowerCase();
  return (
    name === 'typeerror' ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('load failed') ||
    message.includes('fetch failed') ||
    error?.status === 0
  );
}

function connectionErrorMessage() {
  return `${DISCOVER_PEOPLE_NETWORK_TITLE}. ${DISCOVER_PEOPLE_NETWORK_DESCRIPTION}`;
}

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
        if (import.meta.env.DEV) {
          console.debug('[discover-people]', {
            stage: 'rpc_error',
            append,
            offset,
            message: fetchError.message,
            code: fetchError.code,
          });
        }
        if (!append) setPeople([]);
        setError(connectionErrorMessage());
        setHasMore(false);
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      const unique = [];
      let duplicateCount = 0;
      let missingIdCount = 0;

      for (const row of rows) {
        const id = row?.user_id;
        if (!id) {
          missingIdCount += 1;
          continue;
        }
        if (seenIdsRef.current.has(id)) {
          duplicateCount += 1;
          continue;
        }
        seenIdsRef.current.add(id);
        unique.push(row);
      }

      if (import.meta.env.DEV) {
        console.debug('[discover-people]', {
          stage: append ? 'append' : 'initial',
          offset,
          rawCount: rows.length,
          uniqueCount: unique.length,
          duplicateCount,
          missingIdCount,
          totalSeen: seenIdsRef.current.size,
          sample: unique.slice(0, 3).map((p) => ({
            user_id: p.user_id,
            score: p.relevance_score,
            name: p.full_name,
          })),
        });
      }

      setPeople((prev) => (append ? [...prev, ...unique] : unique));
      setHasMore(rows.length >= PAGE_SIZE);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.debug('[discover-people]', {
          stage: 'exception',
          networkLike: isNetworkLikeError(err),
          message: String(err?.message || err),
        });
      }
      if (!append) setPeople([]);
      setError(connectionErrorMessage());
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
