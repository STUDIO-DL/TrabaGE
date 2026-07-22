import AppAvatar from '../common/AppAvatar';
import { formatRelativeTime } from '../../utils/formatDate';

export default function MessageBubble({ message, isOwn, isRead, avatar, showAvatar = false }) {
  return (
    <div className={`flex items-end ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && showAvatar && avatar ? (
        <div className="mr-space-sm shrink-0">
          <AppAvatar
            type={avatar.avatarType}
            src={avatar.avatarSrc}
            name={avatar.name}
            alt={avatar.name}
            size="sm"
            variant={avatar.avatarVariant ?? 'circular'}
          />
        </div>
      ) : null}
      <div
        className={[
          'max-w-[75%] break-words rounded-radius-lg px-space-md py-space-sm',
          isOwn
            ? 'rounded-br-sm bg-primary-600 text-white'
            : 'rounded-bl-sm bg-app-surface text-app-text ring-1 ring-inset ring-app-border',
        ].join(' ')}
      >
        <p className="whitespace-pre-wrap text-body-small leading-relaxed">{message.content}</p>
        <div
          className={[
            'mt-space-xs flex items-center justify-end gap-space-xs text-[11px]',
            isOwn ? 'text-primary-100' : 'text-app-subtle',
          ].join(' ')}
        >
          <span>{formatRelativeTime(message.created_at)}</span>
          {isOwn && isRead ? <span aria-label="Leído">✓ leído</span> : null}
        </div>
      </div>
    </div>
  );
}
