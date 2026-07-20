import { useEffect } from 'react';
import FeedItemRenderer from '../feed/FeedItemRenderer';
import EmptyState from '../common/EmptyState';
import { PostListSkeleton } from '../common/Skeleton';
import Button from '../ui/Button';
import { Newspaper } from '../../constants/icons';
import { useIntelligentFeed } from '../../hooks/useIntelligentFeed';
import { useAuth } from '../../hooks/useAuth';
import { usePostMutations } from '../../hooks/usePostMutations';
import { FEED_CONTENT_TYPES, isHomeFeedPostItem } from '../../constants/feedContentTypes';
import { useNavigate } from 'react-router-dom';
import { rolePath } from '../../constants/roles';

export default function ParaTiPanel({ emptyDescription }) {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { items, loading, loadingMore, hasMore, error, refetch, loadMore } = useIntelligentFeed();
  const { handleEdit, handleDelete } = usePostMutations({ onSuccess: refetch });
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
  const profilePath = role ? rolePath(role, '/profile') : '/personal/profile';

  return (
    <div className="space-y-space-sm p-space-base">
      {error && items.length > 0 ? (
        <div
          className="mb-space-md rounded-radius-lg border border-error-100 bg-error-50 px-space-base py-space-md text-body-small text-error-800"
          role="alert"
        >
          <p>No se pudo actualizar el contenido. Puedes reintentar.</p>
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
          variant="soft"
          icon={Newspaper}
          title="No pudimos cargar tu inicio"
          description="Comprueba tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={refetch}
        />
      ) : feedItems.length === 0 ? (
        <EmptyState
          variant="soft"
          icon={Newspaper}
          title="Aún no hay publicaciones para ti"
          description={
            emptyDescription ??
            'Completa tu perfil para ver contenido de tu sector, habilidades e intereses.'
          }
          actionLabel="Completar perfil"
          onAction={() => navigate(profilePath)}
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
              className="card-enter"
              style={{ animationDelay: `${Math.min(index, 6) * 30}ms` }}
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
      {loadingMore && <PostListSkeleton count={1} />}
      {!loading && !showSkeleton && hasMore && !loadingMore && (
        <Button
          variant="secondary"
          fullWidth
          className="mt-space-sm"
          onClick={loadMore}
          aria-label="Cargar más publicaciones"
        >
          Cargar más
        </Button>
      )}
    </div>
  );
}
