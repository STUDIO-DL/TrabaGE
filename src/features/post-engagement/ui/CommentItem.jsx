import AppIcon from '../../../components/common/AppIcon';
import UserProfileLink from '../../../components/common/UserProfileLink';
import TimeAgo from '../../../components/common/TimeAgo';
import { Heart, ICON_SIZES } from '../../../constants/icons';
import { useAuth } from '../../../hooks/useAuth';
import { getSelfAwareName, isSameUser } from '../../../utils/copyLabels';
import { formatEngagementCount } from './formatEngagementCount';

export default function CommentItem({
  comment,
  depth = 0,
  onLike,
  onReply,
  replies = [],
  repliesLoading = false,
  onLoadReplies,
  repliesExpanded = false,
  hasMoreReplies = false,
  loadingMoreReplies = false,
}) {
  const { user } = useAuth();
  const isOwnComment = isSameUser(user?.id, comment.author_id);
  const displayName = getSelfAwareName(comment.author_name, { isSelf: isOwnComment });
  const likesLabel = formatEngagementCount(comment.likes_count);
  const canNest = depth < 1;
  const remaining = Math.max(0, (comment.replies_count || 0) - replies.length);

  return (
    <div className={depth > 0 ? 'ml-space-lg border-l border-app-divider pl-space-md' : ''}>
      <div className="flex gap-space-sm py-space-sm">
        <UserProfileLink
          userId={comment.author_id}
          userType={comment.author_type}
          name={displayName}
          avatar={comment.author_avatar}
          size="sm"
          layout="avatar"
        />
        <div className="min-w-0 flex-1">
          <div className="rounded-radius-md bg-app-surface px-space-sm py-space-sm">
            <UserProfileLink
              userId={comment.author_id}
              userType={comment.author_type}
              name={displayName}
              layout="name"
              nameClassName="text-label font-semibold text-app-text transition-colors hover:text-primary-700"
            />
            <p className="mt-0.5 whitespace-pre-wrap text-body-small text-app-text">{comment.body}</p>
          </div>
          <div className="mt-space-xs flex flex-wrap items-center gap-space-sm px-space-xs">
            <TimeAgo date={comment.created_at} className="text-caption text-app-subtle" />
            <button
              type="button"
              onClick={() => onLike?.(comment)}
              className={`inline-flex items-center gap-1 text-caption font-medium transition-colors duration-fast ${
                comment.liked_by_me ? 'text-error-600' : 'text-app-muted hover:text-app-text'
              }`}
              aria-pressed={Boolean(comment.liked_by_me)}
            >
              <AppIcon
                icon={Heart}
                size={ICON_SIZES.sm}
                fill={comment.liked_by_me ? 'currentColor' : 'none'}
                strokeWidth={comment.liked_by_me ? 1.75 : 2}
                className={comment.liked_by_me ? 'text-error-600' : undefined}
              />
              {likesLabel || 'Me gusta'}
            </button>
            {canNest ? (
              <button
                type="button"
                onClick={() => onReply?.(comment)}
                className="text-caption font-medium text-app-muted transition-colors duration-fast hover:text-app-text"
              >
                Responder
              </button>
            ) : null}
            {canNest && comment.replies_count > 0 && !repliesExpanded ? (
              <button
                type="button"
                onClick={() => onLoadReplies?.(comment)}
                className="text-caption font-medium text-primary-600"
                disabled={repliesLoading}
              >
                {repliesLoading
                  ? 'Cargando…'
                  : `Ver ${comment.replies_count} respuesta${comment.replies_count === 1 ? '' : 's'}`}
              </button>
            ) : null}
          </div>
          {repliesExpanded && replies.length
            ? replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  depth={depth + 1}
                  onLike={onLike}
                />
              ))
            : null}
          {canNest && repliesExpanded && hasMoreReplies ? (
            <button
              type="button"
              onClick={() => onLoadReplies?.(comment, { append: true })}
              className="mt-space-xs px-space-xs text-caption font-medium text-primary-600"
              disabled={loadingMoreReplies}
            >
              {loadingMoreReplies
                ? 'Cargando…'
                : remaining > 0
                  ? `Cargar más respuestas (${remaining})`
                  : 'Cargar más respuestas'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
