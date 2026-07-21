import { memo } from 'react';
import UserProfileLink from '../common/UserProfileLink';
import Card from '../ui/Card';
import ContentActionMenu from '../common/ContentActionMenu';
import VerifiedBadge from '../company/VerifiedBadge';
import ExpandableText from '../common/ExpandableText';
import { isCompanyVerified } from '../../utils/companyVerification';
import { REPORT_TARGET_TYPES } from '../../constants/reportReasons';
import { generatePostUrl } from '../../utils/generateShareUrl';
import { resolvePostImageUrl } from '../../utils/storagePaths';
import TimeAgo from '../common/TimeAgo';
import PostImage from './PostImage';
import TopicChips from './TopicChips';
import { AUTHOR_TYPES, isEmployerAuthor } from '../../constants/authorTypes';

function PostCard({
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
  defaultTextExpanded = false,
}) {
  const postImageSrc = resolvePostImageUrl(post.post_image_path);
  const authorPath = post.author_path;
  const hasText = Boolean(post.content?.trim());

  return (
    <Card className="mb-space-md min-w-0 max-w-full overflow-hidden" elevation={1}>
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
          {authorHeadline && (
            <p className="text-user-content text-body-small text-app-muted">{authorHeadline}</p>
          )}
          <TimeAgo date={post.created_at} className="mt-space-xs text-caption text-app-subtle" />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-space-xs">
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

      {hasText && <ExpandableText text={post.content} defaultExpanded={defaultTextExpanded} />}

      <PostImage src={postImageSrc} />

      <TopicChips topics={post.topics} />
    </Card>
  );
}

export default memo(PostCard);
