import { memo, useState } from 'react';
import UserProfileLink from '../common/UserProfileLink';
import ContentActionMenu from '../common/ContentActionMenu';
import VerifiedBadge from '../company/VerifiedBadge';
import ExpandableText from '../common/ExpandableText';
import { isCompanyVerified } from '../../utils/companyVerification';
import { REPORT_TARGET_TYPES } from '../../constants/reportReasons';
import { generatePostUrl } from '../../utils/generateShareUrl';
import { resolvePostImageUrl } from '../../utils/storagePaths';
import { shareContent, getShareDescription } from '../../utils/shareContent';
import TimeAgo from '../common/TimeAgo';
import PostImage from './PostImage';
import TopicChips from './TopicChips';
import { AUTHOR_TYPES, isEmployerAuthor } from '../../constants/authorTypes';
import {
  usePostEngagementOrLocal,
  resolveEngagement,
} from '../../features/post-engagement/ui/PostEngagementContext';
import PostActionsBar from '../../features/post-engagement/ui/PostActionsBar';
import PostCommentsSheet from '../../features/post-engagement/ui/PostCommentsSheet';
import RepostModal from '../../features/post-engagement/ui/RepostModal';
import OriginalPostEmbed from '../../features/post-engagement/ui/OriginalPostEmbed';
import { useNotificationContext } from '../../context/NotificationContext';
import { companyAnalyticsService } from '../../features/company-analytics/companyAnalytics.service';
import { useAuth } from '../../hooks/useAuth';
import {
  getPostShareTitle,
  getRepostBannerCopy,
  getSharedByBannerCopy,
  getSelfAwareName,
  isSameUser,
} from '../../utils/copyLabels';

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
  onHidden,
  defaultTextExpanded = false,
}) {
  const { user } = useAuth();
  const { showToast } = useNotificationContext();
  const engagementApi = usePostEngagementOrLocal(post);
  const engagement = resolveEngagement(engagementApi, post);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);
  const [repostLoading, setRepostLoading] = useState(false);

  if (engagement.hidden_by_me) return null;

  const isOwnPost = isSameUser(user?.id, authorId);
  const displayAuthorName = getSelfAwareName(authorName, { isSelf: isOwnPost });
  const postImageSrc = resolvePostImageUrl(post.post_image_path);
  const authorPath = post.author_path;
  const hasText = Boolean(post.content?.trim());
  const shareUrl = generatePostUrl(post.id);
  const shareTitle = getPostShareTitle(authorName, { isSelf: isOwnPost });
  const shareText = (post.content || '').slice(0, 120) || getShareDescription('post');
  const isRepost = Boolean(post.repost_of_id);
  const sharedBy = post.shared_by;
  const isSharedBySelf = isSameUser(user?.id, sharedBy?.id);
  // Outbound notifications to others must keep the real name (never "Tú").
  const actorLabel = authorName?.trim() || undefined;

  const trackShare = () => {
    if (isEmployerAuthor(authorType) && authorId) {
      void companyAnalyticsService.trackPostShare(authorId, post.id);
    }
  };

  const handleExternalShare = () => {
    trackShare();
    shareContent({ title: shareTitle, text: shareText, url: shareUrl, showToast });
  };

  const handleHide = async () => {
    const ok = await engagementApi.hidePost?.(post);
    if (ok) onHidden?.(post);
  };

  const handleRepostDirect = async () => {
    setRepostLoading(true);
    const result = await engagementApi.createRepost?.(post, null, actorLabel);
    setRepostLoading(false);
    return result;
  };

  const handleRepostWithComment = async (commentary) => {
    setRepostLoading(true);
    const result = await engagementApi.createRepost?.(post, commentary, actorLabel);
    setRepostLoading(false);
    return result;
  };

  const attributionBanner = isRepost
    ? getRepostBannerCopy(authorName, { isSelf: isOwnPost })
    : sharedBy
      ? getSharedByBannerCopy(sharedBy.name, { isSelf: isSharedBySelf })
      : null;

  return (
    <article className="feed-post-card">
      {attributionBanner ? (
        <p className="mb-space-sm text-caption font-medium text-app-muted">{attributionBanner}</p>
      ) : null}

      <div className="mb-space-md flex items-start gap-space-md">
        <UserProfileLink
          userId={authorId}
          userType={authorType}
          name={displayAuthorName}
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
              name={displayAuthorName}
              path={authorPath}
              layout="name"
            />
            {isEmployerAuthor(authorType) && isCompanyVerified(authorCompany) && (
              <VerifiedBadge size="sm" />
            )}
          </div>
          {authorHeadline ? (
            <p className="text-user-content text-body-small text-app-muted">{authorHeadline}</p>
          ) : null}
          <TimeAgo date={post.created_at} className="mt-space-xs text-caption text-app-subtle" />
        </div>
        <ContentActionMenu
          shareUrl={shareUrl}
          shareTitle={shareTitle}
          shareText={shareText}
          targetType={REPORT_TARGET_TYPES.POST}
          targetId={post.id}
          reportLabel="Reportar publicación"
          editLabel="Editar publicación"
          deleteLabel="Eliminar publicación"
          saved={engagement.saved_by_me}
          onSave={() => engagementApi.toggleSave?.(post)}
          onHide={canManage ? undefined : () => void handleHide()}
          onEdit={canManage ? () => onEdit?.(post) : undefined}
          onDelete={canManage ? () => onDelete?.(post) : undefined}
        />
      </div>

      {hasText ? <ExpandableText text={post.content} defaultExpanded={defaultTextExpanded} /> : null}

      {isRepost ? (
        <OriginalPostEmbed originalPostId={post.repost_of_id} trackViaRepost />
      ) : (
        <PostImage src={postImageSrc} />
      )}

      <TopicChips topics={post.topics} />

      <PostActionsBar
        engagement={engagement}
        onLike={() => engagementApi.toggleLike?.(post, actorLabel)}
        onComment={() => setCommentsOpen(true)}
        onRepost={() => {
          if (engagement.reposted_by_me) return;
          setRepostOpen(true);
        }}
        onShare={handleExternalShare}
        onSave={() => engagementApi.toggleSave?.(post)}
      />

      <PostCommentsSheet
        post={post}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCommentsChange={(delta) => engagementApi.bumpComments?.(post.id, delta)}
      />

      <RepostModal
        isOpen={repostOpen}
        onClose={() => setRepostOpen(false)}
        onRepostDirect={handleRepostDirect}
        onRepostWithComment={handleRepostWithComment}
        loading={repostLoading}
      />
    </article>
  );
}

export default memo(PostCard);
