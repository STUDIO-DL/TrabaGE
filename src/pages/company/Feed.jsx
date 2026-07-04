import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CompanyFeedHeader from '../../components/feed/CompanyFeedHeader';
import PostComposer from '../../components/feed/PostComposer';
import PostCard from '../../components/feed/PostCard';
import EmptyState from '../../components/common/EmptyState';
import { PostListSkeleton } from '../../components/common/Skeleton';
import { NoPosts } from '../../assets/empty-states';
import { usePosts } from '../../hooks/usePosts';
import { useCreatePost } from '../../hooks/useCreatePost';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { postsService } from '../../services/posts.service';
import { storageService } from '../../services/storage.service';
import { STORAGE_BUCKETS } from '../../constants/storage';
import { filterCandidatePostsByQuery } from '../../utils/feedSearch';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';

export default function Feed() {
  const [query, setQuery] = useState('');
  const { user, isPreviewMode } = useAuth();
  const { showToast } = useNotificationContext();
  const { posts, loading, loadingMore, hasMore, refetch, loadMore } = usePosts();
  const { createPost, loading: publishing } = useCreatePost();

  const filteredPosts = useMemo(
    () => filterCandidatePostsByQuery(posts, query),
    [posts, query],
  );

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
    <PageContainer topBar={<CompanyFeedHeader query={query} onQueryChange={setQuery} />}>
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

        {loading ? (
          <PostListSkeleton count={3} />
        ) : filteredPosts.length === 0 ? (
          <EmptyState
            image={NoPosts}
            title={query.trim() ? 'Sin resultados' : 'No hay publicaciones'}
            description={
              query.trim()
                ? 'Prueba con otro término de búsqueda.'
                : 'Las publicaciones de candidatos aparecerán aquí.'
            }
          />
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              authorId={post.author_id}
              authorName={post.author_name ?? 'Usuario'}
              authorHeadline={post.author_headline ?? ''}
              authorAvatar={post.author_avatar}
              authorType={post.author_type ?? 'candidate'}
              authorCompany={post.author_company}
              canManage={post.author_id === user?.id}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
        {loadingMore && <PostListSkeleton count={1} />}
        {!loading && hasMore && !loadingMore && (
          <button
            type="button"
            onClick={loadMore}
            className="mt-3 w-full rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700"
          >
            Cargar más
          </button>
        )}
      </div>
    </PageContainer>
  );
}
