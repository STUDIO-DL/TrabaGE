import { Link } from 'react-router-dom';
import Card from '../../ui/Card';
import Spinner from '../../ui/Spinner';
import PostCard from '../../feed/PostCard';
import Button from '../../ui/Button';
import AppIcon from '../../common/AppIcon';
import { Image, ICON_SIZES } from '../../../constants/icons';
import { formatTimeAgo } from '../../../utils/formatDate';
import { resolvePostImageUrl } from '../../../utils/storagePaths';
import { getEmptyPostsCopy, resolveOrgViewerContext } from '../../../utils/copyLabels';
import { sectionLinkClass } from './companyProfileStyles';

function truncateText(text, limit = 120) {
  const trimmed = text?.trim?.() ?? '';
  if (!trimmed) return 'Publicación sin texto';
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit).trim()}…`;
}

function CompanyPostPreviewRow({ post }) {
  const imageSrc = resolvePostImageUrl(post.post_image_path);
  const timeLabel = formatTimeAgo(post.created_at);

  return (
    <Link
      to={`/post/${post.id}`}
      className="group flex min-h-touch gap-space-md py-space-sm transition-colors duration-200 hover:bg-app-surface/60"
    >
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-radius-md bg-app-surface ring-1 ring-inset ring-app-border">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-app-subtle">
            <AppIcon icon={Image} size={ICON_SIZES.md} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-body-small leading-snug text-app-text group-hover:text-primary-700">
          {truncateText(post.content)}
        </p>
        {timeLabel && (
          <p className="mt-space-xs text-caption text-app-muted">{timeLabel}</p>
        )}
      </div>
    </Link>
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

    if (embedded) return loadingContent;

    return (
      <section className="px-space-base py-space-base">
        <h3 className="text-subtitle font-semibold text-app-text">Últimas publicaciones</h3>
        {loadingContent}
      </section>
    );
  }

  if (posts.length === 0) return null;

  const previewFeed = (
    <div className="divide-y divide-app-border">
      {visiblePosts.map((post) => (
        <CompanyPostPreviewRow key={post.id} post={post} />
      ))}
    </div>
  );

  const fullFeed = (
    <div className="space-y-space-sm">
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
  );

  const feed = embedded ? previewFeed : fullFeed;

  const viewAllAction = (hasMore || onViewAll) && onViewAll && (
    <button type="button" onClick={onViewAll} className={sectionLinkClass}>
      Ver todas
    </button>
  );

  if (embedded) {
    return (
      <>
        {feed}
        {viewAllAction && <div className="mt-space-sm">{viewAllAction}</div>}
      </>
    );
  }

  return (
    <section className="px-space-base py-space-base">
      <div className="mb-space-sm flex items-center justify-between gap-space-sm">
        <h3 className="text-subtitle font-semibold text-app-text">Últimas publicaciones</h3>
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
    const viewer = resolveOrgViewerContext({ isOwn: !readOnly, profile });
    return (
      <Card padding="lg" className="mx-space-base mt-space-base text-center">
        <p className="text-body-small text-app-muted">{getEmptyPostsCopy(viewer)}</p>
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

