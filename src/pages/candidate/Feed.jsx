import { useEffect } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import FeedHeader from '../../components/feed/FeedHeader';
import FeedItemRenderer from '../../components/feed/FeedItemRenderer';
import EmptyState from '../../components/common/EmptyState';
import { PostListSkeleton } from '../../components/common/Skeleton';
import { NoPosts } from '../../assets/empty-states';
import { useIntelligentFeed } from '../../hooks/useIntelligentFeed';

export default function Feed() {
  const { items, loading, loadingMore, hasMore, error, refetch, loadMore } = useIntelligentFeed();

  useEffect(() => {
    const handleScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 600;
      if (nearBottom) loadMore();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  return (
    <PageContainer topBar={<FeedHeader />}>
      <div className="p-4">
        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p>No se pudo cargar el feed. Inténtalo de nuevo.</p>
            <button
              type="button"
              onClick={refetch}
              className="mt-2 font-medium text-red-700 underline hover:text-red-900"
              aria-label="Reintentar cargar el feed"
            >
              Reintentar
            </button>
          </div>
        )}
        {loading ? (
          <PostListSkeleton count={3} />
        ) : items.length === 0 ? (
          <EmptyState
            image={NoPosts}
            title="No hay contenido"
            description="Tu feed mostrará publicaciones, noticias y recomendaciones según tu perfil."
          />
        ) : (
          items.map((item) => (
            <FeedItemRenderer key={item.item_key ?? item.id} item={item} />
          ))
        )}
        {loadingMore && <PostListSkeleton count={1} />}
        {!loading && hasMore && !loadingMore && (
          <button
            type="button"
            onClick={loadMore}
            aria-label="Cargar más contenido del feed"
            className="mt-3 w-full rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700"
          >
            Cargar más
          </button>
        )}
      </div>
    </PageContainer>
  );
}
