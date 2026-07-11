import UserProfileLink from '../common/UserProfileLink';
import Card from '../ui/Card';
import ContentActionMenu from '../common/ContentActionMenu';
import VerifiedBadge from '../company/VerifiedBadge';
import { isCompanyVerified } from '../../utils/companyVerification';
import { REPORT_TARGET_TYPES } from '../../constants/reportReasons';
import { generatePostUrl } from '../../utils/generateShareUrl';
import { resolvePostImageUrl } from '../../utils/storagePaths';
import TimeAgo from '../common/TimeAgo';
import { AUTHOR_TYPES, isEmployerAuthor } from '../../constants/authorTypes';

export default function PostCard({
  post,
  authorId,
  authorName,
  authorHeadline,
  authorAvatar,
  authorType = AUTHOR_TYPES.PERSONAL,
  authorCompany = null,
  canManage = false,
  onEdit,
  onDelete,
}) {
  const postImageSrc = resolvePostImageUrl(post.post_image_path);
  const authorPath = post.author_path;

  return (
    <Card className="mb-space-md" elevation={1}>
      <div className="mb-space-md flex items-start gap-space-md">
        <UserProfileLink
          userId={authorId}
          userType={authorType}
          name={authorName}
          avatar={authorAvatar}
          path={authorPath}
          size="md"
          layout="avatar"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-space-sm">
            <UserProfileLink
              userId={authorId}
              userType={authorType}
              name={authorName}
              path={authorPath}
              layout="name"
            />
            {isEmployerAuthor(authorType) && isCompanyVerified(authorCompany) && (
              <VerifiedBadge size="sm" />
            )}
          </div>
          {authorHeadline && <p className="text-body-small text-app-muted">{authorHeadline}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-space-xs">
          <TimeAgo date={post.created_at} className="text-caption text-app-subtle" />
          <ContentActionMenu
            shareUrl={generatePostUrl(post.id)}
            shareTitle={`${authorName} en TrabaGE`}
            shareText={(post.content || '').slice(0, 120) || 'Mira esta publicación en TrabaGE.'}
            targetType={REPORT_TARGET_TYPES.POST}
            targetId={post.id}
          />
          {canManage && (
            <div className="flex gap-space-sm text-caption">
              <button
                type="button"
                onClick={() => onEdit?.(post)}
                aria-label="Editar publicación"
                className="font-medium text-primary-600 transition-colors duration-fast hover:text-primary-700"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => onDelete?.(post)}
                aria-label="Eliminar publicación"
                className="font-medium text-error-600 transition-colors duration-fast hover:text-error-700"
              >
                Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="whitespace-pre-wrap text-body-small text-app-text">{post.content}</p>

      {postImageSrc && (
        <img
          src={postImageSrc}
          alt="Imagen de la publicación"
          loading="lazy"
          className="mt-space-md w-full rounded-radius-md object-cover"
        />
      )}
    </Card>
  );
}
