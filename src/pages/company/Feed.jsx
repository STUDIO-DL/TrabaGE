import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CompanyFeedHeader from '../../components/feed/CompanyFeedHeader';
import PostComposer from '../../components/feed/PostComposer';
import FeedItemRenderer from '../../components/feed/FeedItemRenderer';
import EmptyState from '../../components/common/EmptyState';
import { PostListSkeleton } from '../../components/common/Skeleton';
import { NoPosts } from '../../assets/empty-states';
import { useIntelligentFeed } from '../../hooks/useIntelligentFeed';
import { useCreatePost } from '../../hooks/useCreatePost';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { postsService } from '../../services/posts.service';
import { storageService } from '../../services/storage.service';
import { STORAGE_BUCKETS } from '../../constants/storage';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import { FEED_CONTENT_TYPES } from '../../constants/feedContentTypes';

export default function Feed() {
  const { user, isPreviewMode } = useAuth();
  const { showToast } = useNotificationContext();
  const { items, loading, loadingMore, hasMore, error, refetch, loadMore } = useIntelligentFeed();
  const { createPost, loading: publishing } = useCreatePost();

  useEffect(() => {
    const handleScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 600;
      if (nearBottom) loadMore();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  const handleSubmit = async (payload) => {
    const result = await createPost(payload);
    if (result.ok) refetch();
  };

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
      <div className="p-4">
        {isPreviewMode ? (
          <div className="mb-4 rounded-2xl border border-primary-100 bg-primary-50 p-4 text-center">
            <p className="text-sm text-primary-900">{GUEST_MODE_MESSAGE}</p>
            <Link
              to="/login"
              className="mt-3 inline-block rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Iniciar sesión
            </Link>
          </div>
        ) : (
          <PostComposer onSubmit={handleSubmit} loading={publishing} />
        )}

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
            description="Tu feed mostrará publicaciones, noticias del sector y candidatos recomendados."
          />
        ) : (
          items.map((item, index) => {
            const post = item.payload;
            const isPost =
              item.content_type === FEED_CONTENT_TYPES.POST ||
              item.content_type === FEED_CONTENT_TYPES.ADVICE;

            return (
              <FeedItemRenderer
                key={item.item_key ?? item.id}
                item={item}
                jobAccentIndex={index}
                canManage={isPost && post?.author_id === user?.id}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            );
          })
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
