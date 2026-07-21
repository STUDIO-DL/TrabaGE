import AppAvatar from '../common/AppAvatar';
import AppIcon from '../common/AppIcon';
import TimeAgo from '../common/TimeAgo';
import UserProfileLink from '../common/UserProfileLink';
import { Trash2, Briefcase, Newspaper, ICON_SIZES } from '../../constants/icons';
import { AvatarType, avatarTypeFromUserType } from '../../constants/avatarDefaults';
import { getNotificationCategory, NOTIFICATION_CATEGORY } from '../../utils/notificationCategories';

const CATEGORY_BADGE = {
  [NOTIFICATION_CATEGORY.JOBS]: { icon: Briefcase, className: 'bg-primary-600' },
  [NOTIFICATION_CATEGORY.POSTS]: { icon: Newspaper, className: 'bg-primary-700' },
};

function resolveActorType(metadata) {
  return (
    metadata?.actor_type ??
    (metadata?.target_type === 'business' ||
    metadata?.target_type === 'organization' ||
    metadata?.target_type === 'company'
      ? metadata.target_type === 'company'
        ? 'business'
        : metadata.target_type
      : 'personal')
  );
}

export default function NotificationItem({
  notification,
  onClick,
  onDelete,
  actorAvatar,
  actorName,
}) {
  const metadata = notification.metadata ?? {};
  const avatarSrc = actorAvatar ?? metadata.avatar_path ?? metadata.avatar_url;
  const avatarAlt = actorName ?? metadata.actor_name ?? notification.title;
  const actorId = metadata.actor_id;
  const actorType = resolveActorType(metadata);
  const isUnread = !notification.read;

  const category = getNotificationCategory(notification);
  const badge = CATEGORY_BADGE[category];
  // Post notifications: the whole row opens the publication. Do not intercept
  // taps on avatar/name with a profile link (that used to send users to the company).
  const openPostOnRow = category === NOTIFICATION_CATEGORY.POSTS;
  const avatarType = avatarTypeFromUserType(actorType);

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
      className={[
        'group relative flex cursor-pointer items-start gap-space-md rounded-radius-lg px-space-md py-space-md transition-colors duration-fast ease-out',
        isUnread ? 'bg-primary-50/70 hover:bg-primary-50' : 'hover:bg-app-surface',
      ].join(' ')}
    >
      <span className="mt-5 w-2 shrink-0">
        {isUnread && (
          <span className="block h-2 w-2 rounded-radius-circular bg-primary-600" aria-label="No leída" />
        )}
      </span>

      <div className="relative shrink-0">
        {openPostOnRow || !actorId ? (
          <AppAvatar
            type={avatarType}
            src={avatarSrc}
            name={avatarAlt}
            alt={avatarAlt}
            size="sm"
            variant={avatarType === AvatarType.PERSONAL ? 'circular' : 'rounded'}
            className="!h-8 !w-8"
          />
        ) : (
          <UserProfileLink
            userId={actorId}
            userType={actorType}
            name={avatarAlt}
            avatar={avatarSrc}
            size="sm"
            layout="avatar"
            stopPropagation
          />
        )}
        {badge && (
          <span
            className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-radius-circular text-white ring-2 ring-app-card ${badge.className}`}
            aria-hidden="true"
          >
            <AppIcon icon={badge.icon} size={10} />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {openPostOnRow || !actorId ? (
          <p
            className={`truncate text-body-small ${
              isUnread ? 'font-semibold text-app-text' : 'font-medium text-app-muted'
            }`}
          >
            {avatarAlt || notification.title}
          </p>
        ) : (
          <UserProfileLink
            userId={actorId}
            userType={actorType}
            name={avatarAlt}
            layout="name"
            stopPropagation
            nameClassName={`truncate text-body-small hover:text-primary-700 transition-colors ${
              isUnread ? 'font-semibold text-app-text' : 'font-medium text-app-muted'
            }`}
            className="block min-w-0"
          />
        )}
        {notification.body ? (
          <p className="mt-0.5 line-clamp-2 text-body-small text-app-subtle">{notification.body}</p>
        ) : actorId && notification.title && notification.title !== avatarAlt ? (
          <p className="mt-0.5 line-clamp-2 text-body-small text-app-subtle">{notification.title}</p>
        ) : null}
        <TimeAgo date={notification.created_at} className="mt-space-xs block text-caption text-app-subtle" />
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(notification);
          }}
          className="shrink-0 rounded-radius-sm p-space-sm text-app-subtle opacity-70 transition-opacity duration-fast ease-out hover:bg-error-50 hover:text-error-600 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label="Eliminar notificación"
        >
          <AppIcon icon={Trash2} size={ICON_SIZES.sm} />
        </button>
      )}
    </div>
  );
}
