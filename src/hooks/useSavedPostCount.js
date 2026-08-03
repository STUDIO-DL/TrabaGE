import { useEffect, useState } from 'react';
import { postEngagementService } from '../features/post-engagement/data/postEngagement.service';

/**
 * Count of saved posts for the current user (owner-only UI).
 */
export function useSavedPostCount({ enabled = true } = {}) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    postEngagementService.countSavedPosts().then(({ count: next, error }) => {
      if (cancelled) return;
      if (!error) setCount(next ?? 0);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { count, loading };
}
