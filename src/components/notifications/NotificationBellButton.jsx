import { useNavigate } from 'react-router-dom';

import AppIcon from '../common/AppIcon';
import { Bell, ICON_SIZES } from '../../constants/icons';
import { ROLES, getRolePathPrefix } from '../../constants/roles';
import { useNotificationContext } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { useProfile } from '../../hooks/useProfile';
import { useUnreadNotificationsCount } from '../../hooks/useUnreadNotificationsCount';
import { formatUnreadBadge } from '../../utils/formatUnreadBadge';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import {
  areNotificationsConfigured,
  getNotificationSettingsPath,
  getNotificationsInboxPath,
} from '../../utils/notificationSetup';

export default function NotificationBellButton({ className = '', size = ICON_SIZES.md }) {
  const navigate = useNavigate();
  const { user, role, isPreviewMode } = useAuth();
  const { profile } = useProfile();
  const { showToast } = useNotificationContext();
  const { preferences, status } = useNotificationPreferences(user?.id, { disabled: isPreviewMode });
  const { count: unreadCount, loading: unreadLoading } = useUnreadNotificationsCount();
  const badgeLabel = formatUnreadBadge(unreadCount);

  const rolePrefix = getRolePathPrefix(role ?? ROLES.PERSONAL);
  const settingsPath = getNotificationSettingsPath(rolePrefix);
  const inboxPath = getNotificationsInboxPath(rolePrefix);
  const isConfigured = areNotificationsConfigured({ pushPreferences: preferences, profile });
  const isActive = isConfigured;

  const handleClick = () => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      return;
    }

    if (!isConfigured) {
      navigate(settingsPath);
      return;
    }

    navigate(inboxPath);
  };

  const ariaLabel = !isConfigured
    ? 'Configurar notificaciones'
    : badgeLabel
      ? `Ver notificaciones, ${badgeLabel} sin leer`
      : 'Ver notificaciones';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status.loading || status.savingKey === 'push_enabled'}
      className={[
        'group relative inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center overflow-hidden rounded-radius-sm p-space-xs transition-colors duration-fast ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200',
        isActive
          ? 'text-primary-600 hover:bg-primary-50'
          : 'text-slate-400 hover:bg-slate-50 hover:text-slate-500',
        status.loading || unreadLoading ? 'opacity-60' : '',
        className,
      ].join(' ')}
      aria-label={ariaLabel}
      aria-pressed={isActive}
    >
      <AppIcon
        icon={Bell}
        size={size}
        strokeWidth={isActive ? 2.4 : 1.9}
        className={[
          'relative z-[1] transition-transform duration-fast ease-out group-active:scale-95',
          isActive ? 'fill-primary-100' : '',
        ].join(' ')}
      />
      {badgeLabel ? (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 z-[2] inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-radius-circular bg-red-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-app-card transition-[opacity,transform] duration-fast ease-out"
        >
          {badgeLabel}
        </span>
      ) : null}
    </button>
  );
}
