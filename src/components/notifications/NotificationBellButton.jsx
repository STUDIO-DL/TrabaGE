import { useNavigate } from 'react-router-dom';

import AppIcon from '../common/AppIcon';
import { Bell, ICON_SIZES } from '../../constants/icons';
import { ROLES, getRolePathPrefix } from '../../constants/roles';
import { useNotificationContext } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { useProfile } from '../../hooks/useProfile';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import {
  areNotificationsConfigured,
  getNotificationSettingsPath,
  getNotificationsInboxPath,
} from '../../utils/notificationSetup';

export default function NotificationBellButton({ className = '', size = ICON_SIZES.nav }) {
  const navigate = useNavigate();
  const { user, role, isPreviewMode } = useAuth();
  const { profile } = useProfile();
  const { showToast } = useNotificationContext();
  const { preferences, status } = useNotificationPreferences(user?.id, { disabled: isPreviewMode });

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

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status.loading || status.savingKey === 'push_enabled'}
      className={[
        'relative inline-flex shrink-0 items-center justify-center rounded-xl p-2 transition-colors duration-fast ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200',
        isActive
          ? 'text-primary-600 hover:bg-primary-50'
          : 'text-slate-400 hover:bg-slate-50 hover:text-slate-500',
        status.loading ? 'opacity-60' : '',
        className,
      ].join(' ')}
      aria-label={
        isConfigured
          ? 'Ver notificaciones'
          : 'Configurar notificaciones'
      }
      aria-pressed={isActive}
    >
      <AppIcon
        icon={Bell}
        size={size}
        strokeWidth={isActive ? 2.4 : 1.9}
        className={isActive ? 'fill-primary-100' : ''}
      />
    </button>
  );
}
