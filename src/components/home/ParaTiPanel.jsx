import { useEffect, useState } from 'react';
import FeedItemRenderer from '../feed/FeedItemRenderer';
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

const EXIT_MS = 180;

export default function ParaTiPanel({ emptyDescription }) {
  const { user } = useAuth();
  const { items, loading, loadingMore, hasMore, error, refetch, loadMore, removePost } =
    useIntelligentFeed();
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

  useEffect(() => {
    const handleScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 600;
      if (nearBottom) loadMore();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  const showSkeleton = loading || (Boolean(error) && items.length === 0);

  return (
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
        feedItems.map((item, index) => {
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
              />
            </div>
          );
        })
      )}
      {loadingMore ? (
        <div className="pb-space-base">
          <PostListSkeleton count={1} />
        </div>
      ) : null}
      {!loading && !showSkeleton && hasMore && !loadingMore ? (
        <div className="pb-space-base">
          <Button
            variant="secondary"
            fullWidth
            className="mt-space-sm"
            onClick={loadMore}
            aria-label="Cargar más publicaciones"
          >
            Cargar más
          </Button>
        </div>
      ) : null}
      {deleteConfirmModal}
    </div>
  );
}
