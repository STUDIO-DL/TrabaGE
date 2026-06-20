import { useMemo, useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import FeedHeader from '../../components/feed/FeedHeader';
import PostCard from '../../components/feed/PostCard';
import EmptyState from '../../components/common/EmptyState';
import { PostListSkeleton } from '../../components/common/Skeleton';
import { NoPosts } from '../../assets/empty-states';
import { usePosts } from '../../hooks/usePosts';
import { filterPostsByQuery } from '../../utils/feedSearch';

export default function Feed() {
  const [query, setQuery] = useState('');
  const { posts, loading } = usePosts();

  const filteredPosts = useMemo(
    () => filterPostsByQuery(posts, query),
    [posts, query],
  );

  return (
    <PageContainer topBar={<FeedHeader query={query} onQueryChange={setQuery} />}>
      <div className="p-4">
        {loading ? (
          <PostListSkeleton count={3} />
        ) : filteredPosts.length === 0 ? (
          <EmptyState
            image={NoPosts}
            title={query.trim() ? 'Sin resultados' : 'No hay publicaciones'}
            description={
              query.trim()
                ? 'Prueba con otro término de búsqueda.'
                : 'Las publicaciones aparecerán aquí cuando empresas y usuarios compartan contenido.'
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
            />
          ))
        )}
      </div>
    </PageContainer>
  );
}
