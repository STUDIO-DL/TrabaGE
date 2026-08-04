import { isEmployerAuthor } from '../constants/authorTypes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { feedService } from '../services/feed.service';
import { useAuth } from './useAuth';
import { getUserErrorMessage, ERROR_ACTION } from '../utils/userFacingError';
import { FEED_CONTENT_TYPES, FEED_PAGE_SIZE, isHomeFeedPostItem } from '../constants/feedContentTypes';
import { getPreviewPosts } from '../constants/preview';
import { rankAndInterleaveFeed, dedupeFeedItems } from '../utils/feedRanking';
import {
  buildFeedCacheKey,
  patchFeedCacheItems,
  readFeedCache,
  writeFeedCache,
} from '../utils/feedCacheStore';
import { getConnectivityState, isNetworkLikeError } from '../utils/connectivity';
import { subscribeProfileMediaChanged } from '../utils/profileMediaSync';

const MAX_AUTO_RETRIES = 2;

export function useIntelligentFeed({ authorId } = {}) {
  const { user, isPreviewMode, role } = useAuth();
  const cacheKey = useMemo(
    () => buildFeedCacheKey({ userId: user?.id, role, authorId }),
    [authorId, role, user?.id],
  );

  const cached = useMemo(() => readFeedCache(cacheKey), [cacheKey]);
  const [items, setItems] = useState(() => cached?.items ?? []);
  const [loading, setLoading] = useState(() => !(cached?.items?.length > 0));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(() => Boolean(cached?.hasMore));
  const [error, setError] = useState(null);
  const itemsRef = useRef(items);
  const offsetRef = useRef(cached?.offset ?? 0);
  const contextRef = useRef(null);
  const retryCountRef = useRef(0);
  const fetchFeedRef = useRef(null);
  const cacheKeyRef = useRef(cacheKey);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    cacheKeyRef.current = cacheKey;
    const nextCached = readFeedCache(cacheKey);
    contextRef.current = null;
    retryCountRef.current = 0;
    if (nextCached?.items?.length) {
      itemsRef.current = nextCached.items;
      offsetRef.current = nextCached.offset ?? 0;
      setItems(nextCached.items);
      setHasMore(Boolean(nextCached.hasMore));
      setLoading(false);
      setError(null);
    } else {
      offsetRef.current = 0;
      setItems([]);
      setHasMore(false);
      setLoading(true);
    }
  }, [cacheKey]);

  useEffect(() => {
    return subscribeProfileMediaChanged(({ userId: mediaUserId, authorAvatar }) => {
      if (!mediaUserId) return;
      setItems((current) => {
        let changed = false;
        const next = current.map((item) => {
          if (item?.author_id !== mediaUserId) return item;
          changed = true;
          return { ...item, author_avatar: authorAvatar ?? null };
        });
        if (!changed) return current;
        itemsRef.current = next;
        const cached = readFeedCache(cacheKeyRef.current);
        writeFeedCache(cacheKeyRef.current, {
          items: next,
          hasMore: cached?.hasMore ?? true,
          offset: offsetRef.current,
        });
        return next;
      });
    });
  }, []);

  const scheduleRetry = useCallback(() => {
    const attempt = retryCountRef.current;
    const delay = Math.min(400 * 2 ** attempt, 4000);
    window.setTimeout(() => {
      void fetchFeedRef.current?.({ append: false, soft: true });
    }, delay);
  }, []);

  const persistCache = useCallback((nextItems, nextHasMore, nextOffset) => {
    writeFeedCache(cacheKeyRef.current, {
      items: nextItems,
      hasMore: nextHasMore,
      offset: nextOffset,
    });
  }, []);

  const fetchFeed = useCallback(
    async ({ append = false, soft = false } = {}) => {
      const hasCachedItems = itemsRef.current.length > 0;
      const softRefresh = soft || (!append && hasCachedItems);

      if (authorId) {
        if (!softRefresh) setLoading(!append);
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
          if (!append && retryCountRef.current < MAX_AUTO_RETRIES && !isNetworkLikeError(fetchError)) {
            retryCountRef.current += 1;
            scheduleRetry();
            return;
          }
          if (!append && !hasCachedItems) setItems([]);
          if (!hasCachedItems) {
            setError(getUserErrorMessage(fetchError, ERROR_ACTION.discover));
          }
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
        const nextHasMore = (data ?? []).length === FEED_PAGE_SIZE;
        setItems(nextItems);
        setHasMore(nextHasMore);
        setError(null);
        setLoading(false);
        setLoadingMore(false);
        persistCache(nextItems, nextHasMore, nextItems.length);
        return;
      }

      if (append) setLoadingMore(true);
      else if (!softRefresh) {
        setLoading(true);
        offsetRef.current = 0;
      }
      if (!softRefresh) setError(null);

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

      // Offline with cache: skip network and keep showing local feed.
      if (getConnectivityState().offline && hasCachedItems && !append) {
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
        if (!append && retryCountRef.current < MAX_AUTO_RETRIES && !isNetworkLikeError(fetchError)) {
          retryCountRef.current += 1;
          scheduleRetry();
          return;
        }
        if (!append && !hasCachedItems) setItems([]);
        if (!hasCachedItems) {
          setError(getUserErrorMessage(fetchError, ERROR_ACTION.discover));
        }
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
      const nextHasMore = (pool ?? []).length >= FEED_PAGE_SIZE;
      setItems(nextItems);
      setHasMore(nextHasMore);
      setError(null);
      setLoading(false);
      setLoadingMore(false);
      persistCache(nextItems, nextHasMore, offsetRef.current);
    },
    [authorId, isPreviewMode, persistCache, role, scheduleRetry, user],
  );

  fetchFeedRef.current = fetchFeed;

  useEffect(() => {
    // Soft refresh when we already painted from cache; full fetch otherwise.
    void fetchFeed({ append: false, soft: itemsRef.current.length > 0 });
  }, [fetchFeed]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    fetchFeed({ append: true });
  }, [fetchFeed, hasMore, loading, loadingMore]);

  const refetch = useCallback(() => {
    contextRef.current = null;
    offsetRef.current = 0;
    retryCountRef.current = 0;
    fetchFeed({ append: false, soft: itemsRef.current.length > 0 });
  }, [fetchFeed]);

  const removePost = useCallback((postId) => {
    if (!postId) return;
    setItems((prev) => {
      const next = prev.filter((item) => {
        const payload = item?.payload;
        const payloadId = payload?.id;
        if (payloadId && payloadId === postId) return false;
        if (payload?.repost_of_id && payload.repost_of_id === postId) return false;
        const key = String(item?.item_key ?? item?.id ?? '');
        return key !== `post:${postId}`;
      });
      patchFeedCacheItems(cacheKeyRef.current, () => next);
      return next;
    });
  }, []);

  return { items, loading, loadingMore, hasMore, error, refetch, loadMore, removePost };
}
