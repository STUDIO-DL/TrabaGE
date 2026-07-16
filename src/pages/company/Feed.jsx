import { useEffect } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import CompanyFeedHeader from '../../components/feed/CompanyFeedHeader';
import FeedItemRenderer from '../../components/feed/FeedItemRenderer';
import EmptyState from '../../components/common/EmptyState';
import { PostListSkeleton } from '../../components/common/Skeleton';
import Button from '../../components/ui/Button';
import { NoPosts } from '../../assets/empty-states';
import { useIntelligentFeed } from '../../hooks/useIntelligentFeed';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { postsService } from '../../services/posts.service';
import { storageService } from '../../services/storage.service';
import { STORAGE_BUCKETS } from '../../constants/storage';
import { FEED_CONTENT_TYPES } from '../../constants/feedContentTypes';

export default function Feed() {
  const { user } = useAuth();
  const { showToast } = useNotificationContext();
  const { items, loading, loadingMore, hasMore, error, refetch, loadMore } = useIntelligentFeed();

  useEffect(() => {
    const handleScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 600;
      if (nearBottom) loadMore();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  const handleEdit = async (post) => {
    const content = window.prompt('Editar publicación', post.content || '');
    if (content === null) return;
    const trimmed = content.trim();
    if (!trimmed) {
      showToast('La publicación no puede estar vacía.', 'error');
      return;
    }

    const { error } = await postsService.update(post.id, { content: trimmed });
    if (error) {
      showToast('No se pudo actualizar la publicación.', 'error');
      return;
    }

    showToast('Publicación actualizada', 'success');
    refetch();
  };

  const handleDelete = async (post) => {
    const ok = window.confirm('¿Eliminar esta publicación?');
    if (!ok) return;

    const { error } = await postsService.delete(post.id);
    if (error) {
      showToast('No se pudo eliminar la publicación.', 'error');
      return;
    }

    if (post.post_image_path) {
      await storageService.deleteFile(STORAGE_BUCKETS.POST_IMAGES, post.post_image_path);
    }

    showToast('Publicación eliminada', 'success');
    refetch();
  };

  return (
    <PageContainer topBar={<CompanyFeedHeader />}>
      <div className="space-y-space-sm p-space-base">
        {error && (
          <div
            className="mb-space-md rounded-radius-lg border border-error-100 bg-error-50 px-space-base py-space-md text-body-small text-error-800"
            role="alert"
          >
            <p>No se pudo cargar el feed. Inténtalo de nuevo.</p>
            <button
              type="button"
              onClick={refetch}
              className="mt-space-sm font-medium text-error-700 underline transition-colors duration-fast hover:text-error-900"
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
            description="Publicaciones, noticias del sector y candidatos recomendados aparecerán aquí."
          />
        ) : (
          items.map((item, index) => {
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
        {!loading && hasMore && !loadingMore && (
          <Button variant="secondary" fullWidth className="mt-space-sm" onClick={loadMore} aria-label="Cargar más contenido del feed">
            Cargar más
          </Button>
        )}
      </div>
    </PageContainer>
  );
}
