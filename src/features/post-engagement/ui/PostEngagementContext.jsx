import { createContext, useContext, useMemo } from 'react';
import { usePostsEngagement } from '../hooks/usePostEngagement';
import { EMPTY_ENGAGEMENT } from '../domain/constants';

const PostEngagementContext = createContext(null);

export function PostEngagementProvider({ postIds = [], children }) {
  const api = usePostsEngagement(postIds);
  return (
    <PostEngagementContext.Provider value={api}>
      {children}
    </PostEngagementContext.Provider>
  );
}

export function usePostEngagementContext() {
  return useContext(PostEngagementContext);
}

/**
 * Prefers feed-level provider; falls back to a single-post fetch outside feeds.
 */
export function usePostEngagementOrLocal(post) {
  const ctx = usePostEngagementContext();
  const localIds = useMemo(
    () => (ctx || !post?.id ? [] : [post.id]),
    [ctx, post?.id],
  );
  const local = usePostsEngagement(localIds);
  return ctx ?? local;
}

export function resolveEngagement(api, post) {
  if (api?.getEngagement) return api.getEngagement(post);
  return {
    ...EMPTY_ENGAGEMENT,
    likes_count: post?.likes_count ?? 0,
    comments_count: post?.comments_count ?? 0,
    reposts_count: post?.reposts_count ?? 0,
  };
}
