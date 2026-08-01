import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AppAvatar from '../common/AppAvatar';
import { formatConversationListTime } from '../../utils/formatDate';
import { formatUnreadBadge } from '../../utils/formatUnreadBadge';
import { emitConversationRead } from '../../utils/conversationUnreadEvents';
import { rolePath } from '../../constants/roles';

function previewText(lastMessage, currentUserId) {
  if (!lastMessage?.content) return 'Sin mensajes todavía';
  const prefix = lastMessage.senderId === currentUserId ? 'Tú: ' : '';
  return `${prefix}${lastMessage.content}`;
}

export default function ConversationListItem({
  conversation,
  role,
  currentUserId,
  active = false,
}) {
  const rowRef = useRef(null);
  const [ripples, setRipples] = useState([]);

  const participant = conversation.otherParticipant;
  const unreadCount = Number(conversation.unreadCount ?? 0);
  const isUnread = unreadCount > 0;
  const badgeLabel = unreadCount > 1 ? formatUnreadBadge(unreadCount) : null;
  const href = rolePath(role, `/messages/${conversation.id}`);
  const timestamp = conversation.lastMessage?.createdAt ?? conversation.createdAt;

  const spawnRipple = (event) => {
    const row = rowRef.current;
    if (!row) return;
    const rect = row.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.2;
    const x = (event.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2;
    const y = (event.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setRipples((prev) => [...prev, { id, x, y, size }]);
  };

  return (
    <Link
      ref={rowRef}
      to={href}
      onClick={(event) => {
        spawnRipple(event);
        if (isUnread) emitConversationRead(conversation.id);
      }}
      aria-label={
        isUnread
          ? `${participant.name}, ${unreadCount} sin leer`
          : participant.name
      }
      className={[
        'notification-row group relative flex cursor-pointer items-center gap-space-md overflow-hidden',
        'border-b border-app-divider/80 px-space-base py-space-md',
        'transition-colors duration-fast ease-out',
        'active:bg-primary-50/50 dark:active:bg-primary-950/25',
        active
          ? 'bg-primary-50/45 dark:bg-primary-950/25'
          : isUnread
            ? 'bg-app-card hover:bg-primary-50/35 dark:hover:bg-primary-950/20'
            : 'bg-app-card hover:bg-app-surface/60',
      ].join(' ')}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="notification-ripple pointer-events-none absolute rounded-radius-circular"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
          onAnimationEnd={() => {
            setRipples((prev) => prev.filter((item) => item.id !== ripple.id));
          }}
        />
      ))}

      <div className="relative z-[1] shrink-0">
        <AppAvatar
          type={participant.avatarType}
          src={participant.avatarSrc}
          name={participant.name}
          alt={participant.name}
          size="lg"
          variant={participant.avatarVariant ?? 'circular'}
          className="!h-12 !w-12"
        />
      </div>

      <div className="relative z-[1] min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-space-sm">
          <p
            className={[
              'truncate text-body-small leading-snug',
              isUnread ? 'font-semibold text-app-text' : 'font-medium text-app-muted',
            ].join(' ')}
          >
            {participant.name}
          </p>
          {timestamp ? (
            <span
              className={[
                'shrink-0 text-caption leading-none',
                isUnread ? 'font-medium text-primary-600/80' : 'text-app-subtle',
              ].join(' ')}
            >
              {formatConversationListTime(timestamp)}
            </span>
          ) : null}
        </div>

        <div className="mt-space-xs flex items-center justify-between gap-space-sm">
          <p
            className={[
              'truncate text-body-small leading-snug',
              isUnread ? 'font-medium text-app-text/80' : 'text-app-subtle',
            ].join(' ')}
          >
            {previewText(conversation.lastMessage, currentUserId)}
          </p>
        </div>
      </div>

      <div className="relative z-[1] flex w-7 shrink-0 items-center justify-center self-center">
        {badgeLabel ? (
          <span className="inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-radius-circular bg-primary-600 px-1 text-[10px] font-semibold leading-none text-white">
            {badgeLabel}
          </span>
        ) : (
          <span
            className={[
              'notification-unread-dot block h-2.5 w-2.5 rounded-radius-circular bg-primary-600',
              isUnread ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0',
            ].join(' ')}
            aria-hidden={!isUnread}
          />
        )}
      </div>
    </Link>
  );
}
