import { useMemo, useState } from 'react';
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
import { filterCandidatePostsByQuery } from '../../utils/feedSearch';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';

export default function Feed() {
  const [query, setQuery] = useState('');
  const { isPreviewMode } = useAuth();
  const { posts, loading, refetch } = usePosts();
  const { createPost, loading: publishing } = useCreatePost();

  const filteredPosts = useMemo(
    () => filterCandidatePostsByQuery(posts, query),
    [posts, query],
  );

  const handleSubmit = async (payload) => {
    const result = await createPost(payload);
    if (result.ok) refetch();
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
            />
          ))
        )}
      </div>
    </PageContainer>
  );
}
