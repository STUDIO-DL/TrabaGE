import { isEmployerAuthor } from '../constants/authorTypes';
import { useCallback, useEffect, useRef, useState } from 'react';
import { feedService } from '../services/feed.service';
import { useAuth } from './useAuth';
import { FEED_CONTENT_TYPES, FEED_PAGE_SIZE, isHomeFeedPostItem } from '../constants/feedContentTypes';
import { getPreviewPosts } from '../constants/preview';
import { rankAndInterleaveFeed, dedupeFeedItems } from '../utils/feedRanking';

const MAX_AUTO_RETRIES = 2;
const RETRY_DELAY_MS = 700;

export function useIntelligentFeed({ authorId } = {}) {
  const { user, isPreviewMode, role } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const itemsRef = useRef([]);
  const offsetRef = useRef(0);
  const contextRef = useRef(null);
  const retryCountRef = useRef(0);
  const fetchFeedRef = useRef(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    contextRef.current = null;
    offsetRef.current = 0;
    retryCountRef.current = 0;
  }, [user?.id, role, authorId]);

  const scheduleRetry = useCallback(() => {
    window.setTimeout(() => {
      void fetchFeedRef.current?.({ append: false });
    }, RETRY_DELAY_MS);
  }, []);

  const fetchFeed = useCallback(
    async ({ append = false } = {}) => {
      if (authorId) {
        setLoading(!append);
        setLoadingMore(append);
        const { postsService } = await import('../services/posts.service');
        const offset = append ? itemsRef.current.length : 0;
        const includeHidden = Boolean(authorId && user?.id && authorId === user.id);
        const { data, error: fetchError } = await postsService.getByAuthor(authorId, {
          limit: FEED_PAGE_SIZE,
          offset,
          includeHidden,
        });
        if (fetchError) {
          if (!append && retryCountRef.current < MAX_AUTO_RETRIES) {
            retryCountRef.current += 1;
            scheduleRetry();
            return;
          }
          if (!append) setItems([]);
          setError(fetchError.message);
          setLoading(false);
          setLoadingMore(false);
          return;
        }
        retryCountRef.current = 0;
        const mapped = (data ?? []).map((post) => ({
          item_key: `post:${post.id}`,
          content_type: FEED_CONTENT_TYPES.POST,
          relevance_score: 10,
          sort_at: post.created_at,
          payload: post,
        }));
        const enriched = await feedService.enrichFeedItems(mapped, user, role);
        const nextItems = append
          ? dedupeFeedItems([...itemsRef.current, ...enriched])
          : enriched;
        setItems(nextItems);
        setHasMore((data ?? []).length === FEED_PAGE_SIZE);
        setError(null);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        offsetRef.current = 0;
      }
      setError(null);

      if (isPreviewMode) {
        const previewPosts = getPreviewPosts(null, role).map((post) => ({
          item_key: `post:${post.id}`,
          content_type: FEED_CONTENT_TYPES.POST,
          relevance_score: 10,
          sort_at: post.created_at,
          payload: {
            ...post,
            author_name: post.author_name ?? '',
            author_company: isEmployerAuthor(post.author_type)
              ? { is_verified: false, verification_status: 'not_submitted' }
              : null,
          },
        }));
        setItems(previewPosts);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const offset = append ? offsetRef.current : 0;
      const context = contextRef.current ?? (await feedService.buildFeedContext(user?.id, role));
      if (!append) contextRef.current = context;

      const { data: pool, error: fetchError } = await feedService.getPersonalizedFeed(user?.id, role, {
        limit: FEED_PAGE_SIZE,
        offset,
      });

      if (fetchError) {
        if (!append && retryCountRef.current < MAX_AUTO_RETRIES) {
          retryCountRef.current += 1;
          scheduleRetry();
          return;
        }
        if (!append) setItems([]);
        setError(fetchError.message);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      retryCountRef.current = 0;
      const rawItems = pool ?? [];

      const enriched = await feedService.enrichFeedItems(rawItems, user, role);
      const postItems = enriched.filter(isHomeFeedPostItem);
      const ranked = rankAndInterleaveFeed(postItems, context, { limit: FEED_PAGE_SIZE });

      const nextItems = append
        ? dedupeFeedItems([...itemsRef.current, ...ranked])
        : dedupeFeedItems(ranked);

      offsetRef.current = offset + FEED_PAGE_SIZE;
      setItems(nextItems);
      setHasMore((pool ?? []).length >= FEED_PAGE_SIZE);
      setError(null);
      setLoading(false);
      setLoadingMore(false);
    },
    [authorId, isPreviewMode, role, scheduleRetry, user],
  );

  fetchFeedRef.current = fetchFeed;

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    fetchFeed({ append: true });
  }, [fetchFeed, hasMore, loading, loadingMore]);

  const refetch = useCallback(() => {
    contextRef.current = null;
    offsetRef.current = 0;
    retryCountRef.current = 0;
    fetchFeed({ append: false });
  }, [fetchFeed]);

  return { items, loading, loadingMore, hasMore, error, refetch, loadMore };
}
