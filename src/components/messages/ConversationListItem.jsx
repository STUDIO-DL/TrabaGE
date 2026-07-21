import { Link } from 'react-router-dom';
import AppAvatar from '../common/AppAvatar';
import { formatRelativeTime } from '../../utils/formatDate';
import { formatUnreadBadge } from '../../utils/formatUnreadBadge';
import { rolePath } from '../../constants/roles';

function previewText(lastMessage, currentUserId) {
  if (!lastMessage?.content) return 'Sin mensajes todavía';
  const prefix = lastMessage.senderId === currentUserId ? 'Tú: ' : '';
  return `${prefix}${lastMessage.content}`;
}

export default function ConversationListItem({ conversation, role, currentUserId }) {
  const participant = conversation.otherParticipant;
  const badgeLabel = formatUnreadBadge(conversation.unreadCount);
  const href = rolePath(role, `/messages/${conversation.id}`);
  const timestamp = conversation.lastMessage?.createdAt ?? conversation.createdAt;

  return (
    <Link
      to={href}
      className="flex items-center gap-space-md border-b border-app-border px-space-base py-space-md transition-colors duration-fast hover:bg-app-surface"
    >
      <AppAvatar
        type={participant.avatarType}
        src={participant.avatarSrc}
        name={participant.name}
        alt={participant.name}
        size="md"
        variant={participant.avatarVariant ?? 'circular'}
        className="shrink-0"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-space-sm">
          <p className="truncate text-body-small font-semibold text-app-text">{participant.name}</p>
          {timestamp ? (
            <span className="shrink-0 text-caption text-app-subtle">{formatRelativeTime(timestamp)}</span>
          ) : null}
        </div>
        <div className="mt-space-xs flex items-center justify-between gap-space-sm">
          <p className="truncate text-body-small text-app-muted">
            {previewText(conversation.lastMessage, currentUserId)}
          </p>
          {badgeLabel ? (
            <span className="inline-flex min-h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-radius-circular bg-primary-600 px-1 text-[10px] font-semibold leading-none text-white">
              {badgeLabel}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
