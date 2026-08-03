import { useCallback, useEffect, useState } from 'react';
import { postsService } from '../services/posts.service';
import { useAuth } from './useAuth';

/**
 * Loads only the visible post count for a profile author (no post bodies).
 */
export function useAuthorPostCount(authorId, { enabled = true } = {}) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(enabled && authorId));

  const refresh = useCallback(async () => {
    if (!enabled || !authorId) {
      setCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const includeHidden = Boolean(user?.id && user.id === authorId);
    const { count: next, error } = await postsService.countByAuthor(authorId, { includeHidden });
    if (!error) setCount(next ?? 0);
    setLoading(false);
  }, [authorId, enabled, user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { count, loading, refresh };
}
