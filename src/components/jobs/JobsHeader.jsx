import { Link, useNavigate } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { Bell, Bookmark, ICON_SIZES } from '../../constants/icons';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { usePushPermission } from '../../hooks/usePushPermission';
import { useNotificationContext } from '../../context/NotificationContext';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { NOTIFICATION_SAVED_COPY } from '../../constants/notificationPreferences';

export default function JobsHeader() {
  usePushPermission();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotificationContext();
  const { preferences, setMasterEnabled, status } = useNotificationPreferences(user?.id);
  const pushEnabled = preferences.push_enabled;
  const settingsPath = '/candidate/settings/notifications';

  const handleBellClick = async (event) => {
    event.preventDefault();

    if (pushEnabled) {
      navigate(settingsPath);
      return;
    }

    const { data, error } = await setMasterEnabled(true);
    if (error) {
      showToast(getSupabaseErrorMessage(error, 'No se pudieron activar las notificaciones.'), 'error');
      return;
    }

    if (data?.push_enabled) {
      navigate(settingsPath);
      return;
    }

    showToast(NOTIFICATION_SAVED_COPY.denied, 'info');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Empleos</h1>
        <div className="flex items-center gap-1">
          <Link
            to="/candidate/saved-jobs"
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Empleos guardados"
          >
            <AppIcon icon={Bookmark} size={ICON_SIZES.nav} />
          </Link>
          <button
            type="button"
            onClick={handleBellClick}
            disabled={status.savingKey === 'push_enabled'}
            className={[
              'rounded-lg p-2 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200',
              pushEnabled ? 'text-primary-600' : 'text-gray-500',
              status.savingKey === 'push_enabled' ? 'opacity-60' : '',
            ].join(' ')}
            aria-label={pushEnabled ? 'Configurar notificaciones' : 'Activar notificaciones'}
          >
            <AppIcon
              icon={Bell}
              size={ICON_SIZES.nav}
              strokeWidth={pushEnabled ? 2.4 : 1.8}
              className={pushEnabled ? 'fill-primary-100' : ''}
            />
          </button>
        </div>
      </div>
    </header>
  );
}
