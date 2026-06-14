import { useCallback, useEffect, useState } from 'react';
import { postsService } from '../services/posts.service';

export function usePosts(authorId) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = authorId
      ? await postsService.getByAuthor(authorId)
      : await postsService.getFeed();

    setPosts(data ?? []);
    setError(fetchError?.message ?? null);
    setLoading(false);
  }, [authorId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, loading, error, refetch: fetchPosts };
}
