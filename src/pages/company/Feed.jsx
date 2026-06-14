import PageContainer from '../../components/layout/PageContainer';
import PostComposer from '../../components/feed/PostComposer';
import PostCard from '../../components/feed/PostCard';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { usePosts } from '../../hooks/usePosts';

export default function Feed() {
  const { posts, loading } = usePosts();

  return (
    <PageContainer title="Inicio">
      <div className="p-4">
        <PostComposer onSubmit={async () => {}} />
        {loading ? (
          <Spinner fullscreen />
        ) : posts.length === 0 ? (
          <EmptyState
            image="/images/no-posts.png"
            title="Sin publicaciones"
            description="Publica novedades de tu empresa."
          />
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} authorName="Empresa" authorHeadline="" />
          ))
        )}
      </div>
    </PageContainer>
  );
}
