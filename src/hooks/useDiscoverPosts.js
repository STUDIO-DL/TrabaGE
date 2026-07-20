import { useCallback, useEffect, useState } from 'react';
import { FEED_CONTENT_TYPES } from '../constants/feedContentTypes';
import { discoverService } from '../services/discover.service';
import { feedService } from '../services/feed.service';
import { useAuth } from './useAuth';

export function useDiscoverPosts(sectionId) {
  const { user, role } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await discoverService.getSectionPosts(sectionId);
      if (fetchError) {
        setPosts([]);
        setError('No se pudieron cargar las publicaciones.');
        setLoading(false);
        return;
      }

      const rows = data ?? [];
      if (rows.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const items = rows.map((post) => ({
        item_key: `post:${post.id}`,
        content_type: FEED_CONTENT_TYPES.POST,
        payload: post,
      }));
      const enriched = await feedService.enrichFeedItems(items, user, role);
      setPosts(enriched.map((item) => item.payload));
    } catch {
      setPosts([]);
      setError('No se pudieron cargar las publicaciones.');
    } finally {
      setLoading(false);
    }
  }, [sectionId, user, role]);

  useEffect(() => {
    void load();
  }, [load]);

  return { posts, loading, error, reload: load };
}
