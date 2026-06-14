import { useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import FeedHeader from '../../components/feed/FeedHeader';
import PostCard from '../../components/feed/PostCard';
import EmptyState from '../../components/common/EmptyState';
import { PostListSkeleton } from '../../components/common/Skeleton';
import { NoPosts } from '../../assets/empty-states';
import { usePosts } from '../../hooks/usePosts';

export default function Feed() {
  const [query, setQuery] = useState('');
  const { posts, loading } = usePosts();

  return (
    <PageContainer topBar={<FeedHeader query={query} onQueryChange={setQuery} />}>
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
              authorName="Usuario"
              authorHeadline=""
              authorAvatar={post.author_avatar}
              authorType={post.author_type ?? 'candidate'}
            />
          ))
        )}
      </div>
    </PageContainer>
  );
}
