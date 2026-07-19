import { useEffect } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import FeedHeader from '../../components/feed/FeedHeader';
import FeedItemRenderer from '../../components/feed/FeedItemRenderer';
import EmptyState from '../../components/common/EmptyState';
import { PostListSkeleton } from '../../components/common/Skeleton';
import Button from '../../components/ui/Button';
import { Newspaper } from '../../constants/icons';
import { useIntelligentFeed } from '../../hooks/useIntelligentFeed';
import { isHomeFeedPostItem } from '../../constants/feedContentTypes';

export default function Feed() {
  const { items, loading, loadingMore, hasMore, error, refetch, loadMore } = useIntelligentFeed();
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
    <PageContainer topBar={<FeedHeader />}>
      <div className="space-y-space-sm p-space-base">
        {error && items.length > 0 ? (
          <div
            className="mb-space-md rounded-radius-lg border border-error-100 bg-error-50 px-space-base py-space-md text-body-small text-error-800"
            role="alert"
          >
            <p>No se pudo actualizar el feed. Puedes reintentar.</p>
            <button
              type="button"
              onClick={refetch}
              className="mt-space-sm font-medium text-error-700 underline transition-colors duration-fast hover:text-error-900"
              aria-label="Reintentar cargar el feed"
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
            title="No pudimos cargar el feed"
            description="Comprueba tu conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={refetch}
          />
        ) : feedItems.length === 0 ? (
          <EmptyState
            variant="soft"
            icon={Newspaper}
            title="Tu feed está vacío"
            description="Aquí verás publicaciones de personas y cuentas que sigues."
          />
        ) : (
          feedItems.map((item, index) => (
            <div
              key={item.item_key ?? item.id}
              className="card-enter"
              style={{ animationDelay: `${Math.min(index, 6) * 30}ms` }}
            >
              <FeedItemRenderer item={item} />
            </div>
          ))
        )}
        {loadingMore && <PostListSkeleton count={1} />}
        {!loading && !showSkeleton && hasMore && !loadingMore && (
          <Button
            variant="secondary"
            fullWidth
            className="mt-space-sm"
            onClick={loadMore}
            aria-label="Cargar más contenido del feed"
          >
            Cargar más
          </Button>
        )}
      </div>
    </PageContainer>
  );
}
