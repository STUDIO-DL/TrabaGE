import { useEffect, useMemo, useState } from 'react';
import FeedItemRenderer from '../feed/FeedItemRenderer';
import FeedEndMarker from '../feed/FeedEndMarker';
import EmptyState from '../common/EmptyState';
import { PostListSkeleton } from '../common/Skeleton';
import Button from '../ui/Button';
import { useIntelligentFeed } from '../../hooks/useIntelligentFeed';
import { useAuth } from '../../hooks/useAuth';
import { usePostMutations } from '../../hooks/usePostMutations';
import { FEED_CONTENT_TYPES, isHomeFeedPostItem } from '../../constants/feedContentTypes';
import {
  EMPTY_CONTENT_TITLE,
  FETCH_ERROR_DESCRIPTION,
  FETCH_ERROR_TITLE,
} from '../../constants/emptyContent';
import {
  PostEngagementProvider,
  usePostEngagementContext,
} from '../../features/post-engagement/ui/PostEngagementContext';

const EXIT_MS = 180;

function ParaTiFeedList({
  feedItems,
  user,
  exitingIds,
  handleEdit,
  handleDelete,
  onHidden,
}) {
  const engagement = usePostEngagementContext();
  const engagementMap = engagement?.engagementByPostId;

  const visibleItems = useMemo(() => {
    if (!engagementMap) return feedItems;
    return feedItems.filter((item) => {
      const postId = item?.payload?.id;
      if (!postId) return true;
      return !engagementMap[postId]?.hidden_by_me;
    });
  }, [engagementMap, feedItems]);

  return visibleItems.map((item, index) => {
    const post = item.payload;
    const isPost =
      item.content_type === FEED_CONTENT_TYPES.POST ||
      item.content_type === FEED_CONTENT_TYPES.ADVICE;

    return (
      <div
        key={item.item_key ?? item.id}
        className={exitingIds.has(post?.id) ? 'card-exit' : 'card-enter'}
        style={
          exitingIds.has(post?.id)
            ? undefined
            : { animationDelay: `${Math.min(index, 6) * 30}ms` }
        }
      >
        <FeedItemRenderer
          item={item}
          canManage={isPost && post?.author_id === user?.id}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onHidden={onHidden}
        />
      </div>
    );
  });
}

export default function ParaTiPanel({ authorId = null, emptyDescription }) {
  const { user } = useAuth();
  const { items, loading, loadingMore, hasMore, error, refetch, loadMore, removePost } =
    useIntelligentFeed({ authorId: authorId || undefined });
  const [exitingIds, setExitingIds] = useState(() => new Set());
  const { handleEdit, handleDelete, deleteConfirmModal } = usePostMutations({
    onSuccess: (deletedPost) => {
      if (!deletedPost?.id) {
        refetch();
        return;
      }
      const id = deletedPost.id;
      setExitingIds((prev) => new Set(prev).add(id));
      window.setTimeout(() => {
        removePost(id);
        setExitingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, EXIT_MS);
    },
  });
  const feedItems = items.filter(isHomeFeedPostItem);

  const postIds = useMemo(
    () => feedItems.map((item) => item?.payload?.id).filter(Boolean),
    [feedItems],
  );

  const handleHidden = (post) => {
    if (post?.id) removePost(post.id);
  };

  useEffect(() => {
    const handleScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 600;
      if (nearBottom) loadMore();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  const showSkeleton = loading || (Boolean(error) && items.length === 0);

  const showEndMarker =
    !loading && !showSkeleton && !loadingMore && !hasMore && feedItems.length > 0;

  return (
    <PostEngagementProvider postIds={postIds}>
      <div className="space-y-space-sm px-space-base pt-space-base pb-0">
        {error && items.length > 0 ? (
          <div
            className="mb-space-md rounded-radius-lg border border-error-100 bg-error-50 px-space-base py-space-md text-body-small text-error-800"
            role="alert"
          >
            <p>{FETCH_ERROR_TITLE}</p>
            <button
              type="button"
              onClick={refetch}
              className="mt-space-sm font-medium text-error-700 underline transition-colors duration-fast hover:text-error-900"
              aria-label="Reintentar cargar publicaciones"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {showSkeleton ? (
          <PostListSkeleton count={3} />
        ) : error && items.length === 0 ? (
          <EmptyState
            variant="text"
            title={FETCH_ERROR_TITLE}
            description={FETCH_ERROR_DESCRIPTION}
            actionLabel="Reintentar"
            onAction={refetch}
          />
        ) : feedItems.length === 0 ? (
          <EmptyState
            variant="text"
            title={EMPTY_CONTENT_TITLE}
            description={emptyDescription || undefined}
          />
        ) : (
          <ParaTiFeedList
            feedItems={feedItems}
            user={user}
            exitingIds={exitingIds}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
            onHidden={handleHidden}
          />
        )}
        {loadingMore ? <PostListSkeleton count={1} /> : null}
        {!loading && !showSkeleton && hasMore && !loadingMore ? (
          <Button
            variant="secondary"
            fullWidth
            className="mt-space-sm"
            onClick={loadMore}
            aria-label="Cargar más publicaciones"
          >
            Cargar más
          </Button>
        ) : null}
        {showEndMarker ? <FeedEndMarker /> : null}
        {deleteConfirmModal}
      </div>
    </PostEngagementProvider>
  );
}
