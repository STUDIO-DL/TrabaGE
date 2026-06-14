import UserAvatar from '../common/UserAvatar';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import { formatRelativeTime } from '../../utils/formatDate';

export default function NotificationItem({ notification, onClick, actorAvatar, actorName }) {
  const avatarSrc = actorAvatar ?? notification.metadata?.avatar_url;
  const avatarAlt = actorName ?? notification.metadata?.actor_name ?? notification.title;

  return (
    <Card
      padding="sm"
      className={`mb-2 cursor-pointer ${notification.read ? 'opacity-70' : 'border-primary-100'}`}
      onClick={() => onClick?.(notification)}
    >
      <div className="flex items-start gap-3">
        <UserAvatar src={avatarSrc} alt={avatarAlt} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-gray-900">{notification.title}</p>
              {notification.body && <p className="mt-1 text-sm text-gray-500">{notification.body}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-xs text-gray-400">{formatRelativeTime(notification.created_at)}</span>
              {!notification.read && <Badge variant="pending" label="Nuevo" />}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
