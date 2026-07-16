import Card from '../../ui/Card';
import Spinner from '../../ui/Spinner';
import PostCard from '../../feed/PostCard';
import Button from '../../ui/Button';

export default function CompanyPostsSection({
  posts = [],
  loading = false,
  maxVisible,
  onViewAll,
  canManage = false,
  onEdit,
  onDelete,
}) {
  const limit = maxVisible ?? posts.length;
  const visiblePosts = posts.slice(0, limit);
  const hasMore = posts.length > limit;

  if (loading) {
    return (
      <section className="px-space-base py-space-base">
        <h3 className="text-body font-semibold text-app-text">Últimas publicaciones</h3>
        <div className="flex justify-center py-space-xl">
          <Spinner size="md" />
        </div>
      </section>
    );
  }

  if (posts.length === 0) return null;

  return (
    <section className="px-space-base py-space-base">
      <h3 className="text-body font-semibold text-app-text">Últimas publicaciones</h3>
      <div className="mt-space-base space-y-space-base">
        {visiblePosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            authorId={post.author_id}
            authorName={post.author_name}
            authorHeadline={post.author_headline}
            authorAvatar={post.author_avatar}
            authorType={post.author_type}
            authorCompany={post.author_company}
            canManage={canManage}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
      {(hasMore || onViewAll) && onViewAll && (
        <Button
          type="button"
          variant="ghost"
          fullWidth
          className="mt-space-base"
          onClick={onViewAll}
        >
          Ver todas
        </Button>
      )}
    </section>
  );
}

export function CompanyPostsFeed({
  posts = [],
  loading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  canManage = false,
  onEdit,
  onDelete,
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-space-xl">
        <Spinner size="md" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card padding="lg" className="mx-space-base mt-space-base text-center">
        <p className="text-body-small text-app-muted">
          Esta empresa aún no ha publicado contenido.
        </p>
      </Card>
    );
  }

  return (
    <div className="px-space-base py-space-base">
      <div className="space-y-space-base">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            authorId={post.author_id}
            authorName={post.author_name}
            authorHeadline={post.author_headline}
            authorAvatar={post.author_avatar}
            authorType={post.author_type}
            authorCompany={post.author_company}
            canManage={canManage}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
      {hasMore && (
        <Button
          type="button"
          variant="ghost"
          fullWidth
          loading={loadingMore}
          className="mt-space-base"
          onClick={onLoadMore}
        >
          Cargar más
        </Button>
      )}
    </div>
  );
}
