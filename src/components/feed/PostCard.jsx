import UserProfileLink from '../common/UserProfileLink';
import Card from '../ui/Card';
import ContentActionMenu from '../common/ContentActionMenu';
import VerifiedBadge from '../company/VerifiedBadge';
import { isCompanyVerified } from '../../utils/companyVerification';
import { REPORT_TARGET_TYPES } from '../../constants/reportReasons';
import { resolvePostImageUrl } from '../../utils/storagePaths';
import { formatRelativeTime } from '../../utils/formatDate';

export default function PostCard({
  post,
  authorId,
  authorName,
  authorHeadline,
  authorAvatar,
  authorType = 'candidate',
  authorCompany = null,
}) {
  const postImageSrc = resolvePostImageUrl(post.post_image_path);

  return (
    <Card className="mb-3">
      <div className="mb-3 flex items-start gap-3">
        <UserProfileLink
          userId={authorId}
          userType={authorType}
          name={authorName}
          avatar={authorAvatar}
          size="md"
          layout="avatar"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <UserProfileLink
              userId={authorId}
              userType={authorType}
              name={authorName}
              layout="name"
            />
            {authorType === 'company' && isCompanyVerified(authorCompany) && (
              <VerifiedBadge size="sm" />
            )}
          </div>
          {authorHeadline && <p className="text-sm text-gray-500">{authorHeadline}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xs text-gray-400">{formatRelativeTime(post.created_at)}</span>
          <ContentActionMenu
            shareUrl={`/feed/post/${post.id}`}
            shareTitle={(post.content || '').slice(0, 50)}
            targetType={REPORT_TARGET_TYPES.POST}
            targetId={post.id}
            shareMode="panel"
          />
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm text-gray-800">{post.content}</p>

      {postImageSrc && (
        <img src={postImageSrc} alt="" className="mt-3 w-full rounded-xl object-cover" />
      )}
    </Card>
  );
}
