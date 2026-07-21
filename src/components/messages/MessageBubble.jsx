import { formatRelativeTime } from '../../utils/formatDate';

export default function MessageBubble({ message, isOwn, isRead }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
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
