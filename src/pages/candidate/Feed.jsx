import { useEffect } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import FeedHeader from '../../components/feed/FeedHeader';
import PostCard from '../../components/feed/PostCard';
import EmptyState from '../../components/common/EmptyState';
import { PostListSkeleton } from '../../components/common/Skeleton';
import { NoPosts } from '../../assets/empty-states';
import { usePosts } from '../../hooks/usePosts';

export default function Feed() {
  const { posts, loading, loadingMore, hasMore, loadMore } = usePosts();

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
        {loading ? (
          <PostListSkeleton count={3} />
        ) : posts.length === 0 ? (
          <EmptyState
            image={NoPosts}
            title="No hay publicaciones"
            description="Las publicaciones aparecerán aquí cuando empresas y usuarios compartan contenido."
          />
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              authorId={post.author_id}
              authorName={post.author_name ?? 'Usuario'}
              authorHeadline={post.author_headline ?? ''}
              authorAvatar={post.author_avatar}
              authorType={post.author_type ?? 'candidate'}
              authorCompany={post.author_company}
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
