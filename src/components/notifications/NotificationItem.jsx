import UserProfileLink from '../common/UserProfileLink';
import AppIcon from '../common/AppIcon';
import TimeAgo from '../common/TimeAgo';
import { Trash2, Briefcase, Newspaper, ICON_SIZES } from '../../constants/icons';
import { getNotificationCategory, NOTIFICATION_CATEGORY } from '../../utils/notificationCategories';

const CATEGORY_BADGE = {
  [NOTIFICATION_CATEGORY.JOBS]: { icon: Briefcase, className: 'bg-primary-600' },
  [NOTIFICATION_CATEGORY.POSTS]: { icon: Newspaper, className: 'bg-indigo-500' },
};

export default function NotificationItem({
  notification,
  onClick,
  onDelete,
  actorAvatar,
  actorName,
}) {
  const avatarSrc = actorAvatar ?? notification.metadata?.avatar_url;
  const avatarAlt = actorName ?? notification.metadata?.actor_name ?? notification.title;
  const actorId = notification.metadata?.actor_id;
  const actorType = notification.metadata?.actor_type ?? 'candidate';
  const isUnread = !notification.read;

  const category = getNotificationCategory(notification);
  const badge = CATEGORY_BADGE[category];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(notification)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.(notification);
        }
      }}
      className={`group relative flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-3 transition-colors ${
        isUnread
          ? 'bg-primary-50/70 hover:bg-primary-50'
          : 'hover:bg-gray-50'
      }`}
    >
      {/* Unread indicator dot */}
      <span className="mt-5 w-2 shrink-0">
        {isUnread && (
          <span className="block h-2 w-2 rounded-full bg-primary-600" aria-label="No leída" />
        )}
      </span>

      {/* Avatar + category badge */}
      <div className="relative shrink-0">
        <UserProfileLink
          userId={actorId}
          userType={actorType}
          name={avatarAlt}
          avatar={avatarSrc}
          size="sm"
          layout="avatar"
          stopPropagation
        />
        {badge && (
          <span
            className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-white ring-2 ring-app-card ${badge.className}`}
            aria-hidden="true"
          >
            <AppIcon icon={badge.icon} size={10} />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{notification.body}</p>
        )}
        <TimeAgo date={notification.created_at} className="mt-1 block text-xs text-gray-400" />
      </div>

      {/* Subtle delete action */}
      {onDelete && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(notification);
          }}
          className="shrink-0 rounded-lg p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
          aria-label="Eliminar notificación"
        >
          <AppIcon icon={Trash2} size={ICON_SIZES.sm} />
        </button>
      )}
    </div>
  );
}
