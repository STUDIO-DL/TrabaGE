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
            description="Sé el primero en compartir algo con la comunidad."
          />
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} authorName="Usuario" authorHeadline="" />
          ))
        )}
      </div>
    </PageContainer>
  );
}
