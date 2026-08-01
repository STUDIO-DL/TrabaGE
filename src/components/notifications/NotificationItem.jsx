import { useRef, useState } from 'react';
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
  const rowRef = useRef(null);
  const [ripples, setRipples] = useState([]);

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

  const titleText = avatarAlt || notification.title;
  const descriptionText = notification.body
    ? notification.body
    : actorId && notification.title && notification.title !== avatarAlt
      ? notification.title
      : null;

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

  const handleActivate = (event) => {
    spawnRipple(event);
    onClick?.(notification);
  };

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleActivate(event);
        }
      }}
      aria-label={isUnread ? `${titleText} (no leída)` : titleText}
      className={[
        'notification-row group relative flex cursor-pointer items-start gap-space-md overflow-hidden',
        'border-b border-app-divider/80 px-space-base py-space-md last:border-b-0',
        'transition-colors duration-fast ease-out',
        'active:bg-primary-50/50 dark:active:bg-primary-950/25',
        isUnread
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
        {openPostOnRow || !actorId ? (
          <AppAvatar
            type={avatarType}
            src={avatarSrc}
            name={avatarAlt}
            alt={avatarAlt}
            size="md"
            variant={avatarType === AvatarType.PERSONAL ? 'circular' : 'rounded'}
            className="!h-11 !w-11"
          />
        ) : (
          <UserProfileLink
            userId={actorId}
            userType={actorType}
            name={avatarAlt}
            avatar={avatarSrc}
            size="md"
            layout="avatar"
            stopPropagation
          />
        )}
        {badge ? (
          <span
            className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-radius-circular text-white ring-2 ring-app-card ${badge.className}`}
            aria-hidden="true"
          >
            <AppIcon icon={badge.icon} size={10} />
          </span>
        ) : null}
      </div>

      <div className="relative z-[1] min-w-0 flex-1 pt-0.5">
        {openPostOnRow || !actorId ? (
          <p
            className={[
              'text-user-content text-body-small leading-snug',
              isUnread ? 'font-semibold text-app-text' : 'font-medium text-app-muted',
            ].join(' ')}
          >
            {titleText}
          </p>
        ) : (
          <UserProfileLink
            userId={actorId}
            userType={actorType}
            name={avatarAlt}
            layout="name"
            stopPropagation
            nameClassName={[
              'text-user-content text-body-small leading-snug transition-colors hover:text-primary-700',
              isUnread ? 'font-semibold text-app-text' : 'font-medium text-app-muted',
            ].join(' ')}
            className="block min-w-0"
          />
        )}

        {descriptionText ? (
          <p
            className={[
              'mt-0.5 line-clamp-2 text-body-small leading-snug',
              isUnread ? 'text-app-muted' : 'text-app-subtle',
            ].join(' ')}
          >
            {descriptionText}
          </p>
        ) : null}

        <TimeAgo
          date={notification.created_at}
          className={[
            'mt-space-xs block text-caption',
            isUnread ? 'font-medium text-primary-600/80' : 'text-app-subtle',
          ].join(' ')}
        />
      </div>

      <div className="relative z-[1] flex shrink-0 items-center gap-space-xs self-center">
        {onDelete ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(notification);
            }}
            className="rounded-radius-sm p-space-sm text-app-subtle opacity-70 transition-opacity duration-fast ease-out hover:bg-error-50 hover:text-error-600 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="Eliminar notificación"
          >
            <AppIcon icon={Trash2} size={ICON_SIZES.sm} />
          </button>
        ) : null}

        <span
          className={[
            'notification-unread-dot block h-2.5 w-2.5 shrink-0 rounded-radius-circular bg-primary-600',
            isUnread ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0',
          ].join(' ')}
          aria-hidden={!isUnread}
          aria-label={isUnread ? 'No leída' : undefined}
        />
      </div>
    </div>
  );
}
