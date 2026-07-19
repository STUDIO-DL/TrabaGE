import { Link } from 'react-router-dom';
import Spinner from '../../ui/Spinner';
import PostCard from '../../feed/PostCard';
import Button from '../../ui/Button';
import AppIcon from '../../common/AppIcon';
import { Newspaper, ICON_SIZES } from '../../../constants/icons';
import { getEmptyPostsCopy, resolveOrgViewerContext } from '../../../utils/copyLabels';
import { sectionLinkClass } from './companyProfileStyles';
import { ROLES, rolePath } from '../../../constants/roles';
import { useAuth } from '../../../hooks/useAuth';

function PostsEmptyState({ readOnly, profile }) {
  const { role } = useAuth();
  const viewer = resolveOrgViewerContext({ isOwn: !readOnly, profile });
  const publishPath = rolePath(role || ROLES.BUSINESS, '/publish');

  return (
    <div className="rounded-radius-lg border border-dashed border-app-border bg-app-surface px-space-base py-space-xl text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-radius-md bg-app-surface ring-1 ring-app-border">
        <AppIcon icon={Newspaper} size={ICON_SIZES.lg} className="text-app-text" />
      </span>
      <p className="mt-space-sm text-body-small text-app-muted">{getEmptyPostsCopy(viewer)}</p>
      {!readOnly ? (
        <Link to={publishPath} className={`mt-space-md inline-block ${sectionLinkClass}`}>
          Crear publicación
        </Link>
      ) : null}
    </div>
  );
}

function renderPostCard(post, { canManage, onEdit, onDelete }) {
  return (
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
  );
}

export default function CompanyPostsSection({
  posts = [],
  loading = false,
  maxVisible,
  onViewAll,
  canManage = false,
  onEdit,
  onDelete,
  embedded = false,
  readOnly = false,
  profile = null,
}) {
  const limit = maxVisible ?? posts.length;
  const visiblePosts = posts.slice(0, limit);
  const hasMore = posts.length > limit;

  if (loading) {
    const loadingContent = (
      <div className="flex justify-center py-space-lg">
        <Spinner size="md" />
      </div>
    );
    return embedded ? loadingContent : loadingContent;
  }

  if (posts.length === 0) {
    return <PostsEmptyState readOnly={readOnly} profile={profile} />;
  }

  const feed = (
    <div className="space-y-space-base">
      {visiblePosts.map((post) => renderPostCard(post, { canManage, onEdit, onDelete }))}
    </div>
  );

  const viewAllAction =
    (hasMore || onViewAll) && onViewAll ? (
      <button type="button" onClick={onViewAll} className={sectionLinkClass}>
        Ver todas
      </button>
    ) : null;

  if (embedded) {
    return (
      <>
        {feed}
        {viewAllAction ? <div className="mt-space-md">{viewAllAction}</div> : null}
      </>
    );
  }

  return (
    <section className="px-space-base py-space-base">
      <div className="mb-space-md flex items-center justify-between gap-space-sm">
        <h3 className="text-subtitle font-semibold text-app-text">Publicaciones</h3>
        {viewAllAction}
      </div>
      {feed}
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
  readOnly = false,
  profile = null,
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
      <div className="px-space-base py-space-base">
        <PostsEmptyState readOnly={readOnly} profile={profile} />
      </div>
    );
  }

  return (
    <div className="px-space-base py-space-base">
      <div className="space-y-space-base">
        {posts.map((post) => renderPostCard(post, { canManage, onEdit, onDelete }))}
      </div>
      {hasMore ? (
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
      ) : null}
    </div>
  );
}
