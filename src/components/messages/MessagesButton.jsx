import { useNavigate } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { MessageSquare, ICON_SIZES } from '../../constants/icons';
import { useAuth } from '../../hooks/useAuth';
import { useUnreadMessagesCount } from '../../hooks/useUnreadMessagesCount';
import { useNotificationContext } from '../../context/NotificationContext';
import { ROLES, rolePath } from '../../constants/roles';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import { formatUnreadBadge } from '../../utils/formatUnreadBadge';

export default function MessagesButton({ className = '', size = ICON_SIZES.md }) {
  const navigate = useNavigate();
  const { role, isPreviewMode } = useAuth();
  const { showToast } = useNotificationContext();
  const { count, loading } = useUnreadMessagesCount();
  const badgeLabel = formatUnreadBadge(count);
  const messagesPath = rolePath(role ?? ROLES.PERSONAL, '/messages');

  const handleClick = () => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      return;
    }
    navigate(messagesPath);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={[
        'relative inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm p-space-xs transition-colors duration-fast ease-out',
        'text-app-muted hover:bg-app-surface hover:text-app-text',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200',
        loading ? 'opacity-60' : '',
        className,
      ].join(' ')}
      aria-label={badgeLabel ? `Mensajes, ${badgeLabel} sin leer` : 'Mensajes'}
    >
      <AppIcon icon={MessageSquare} size={size} strokeWidth={2} />
      {badgeLabel ? (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-radius-circular bg-primary-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-app-card">
          {badgeLabel}
        </span>
      ) : null}
    </button>
  );
}
