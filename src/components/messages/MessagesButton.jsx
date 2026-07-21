import { useNavigate } from 'react-router-dom';
import { ICON_SIZES } from '../../constants/icons';
import { useAuth } from '../../hooks/useAuth';
import { useUnreadMessagesCount } from '../../hooks/useUnreadMessagesCount';
import { useNotificationContext } from '../../context/NotificationContext';
import { ROLES, rolePath } from '../../constants/roles';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import { getMessagesBadgeState } from '../../utils/formatUnreadBadge';
import MessagesChatIcon from './MessagesChatIcon';

export default function MessagesButton({ className = '', size = ICON_SIZES.md }) {
  const navigate = useNavigate();
  const { role, isPreviewMode } = useAuth();
  const { showToast } = useNotificationContext();
  const { count, loading } = useUnreadMessagesCount();
  const badge = getMessagesBadgeState(count);
  const messagesPath = rolePath(role ?? ROLES.PERSONAL, '/messages');

  const handleClick = () => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      return;
    }
    navigate(messagesPath);
  };

  const ariaLabel =
    badge.type === 'count'
      ? `Mensajes, ${badge.label} sin leer`
      : badge.type === 'dot'
        ? 'Mensajes sin leer'
        : 'Mensajes';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={[
        'group relative inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center overflow-hidden rounded-radius-sm p-space-xs',
        'text-app-muted transition-all duration-fast ease-out',
        'hover:bg-app-surface hover:text-app-text',
        'active:scale-[0.94] active:bg-app-surface/80',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200',
        loading ? 'opacity-60' : '',
        className,
      ].join(' ')}
      aria-label={ariaLabel}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-radius-sm bg-app-text opacity-0 transition-opacity duration-fast group-active:opacity-[0.06]"
      />
      <MessagesChatIcon
        size={size}
        strokeWidth={1.85}
        className="relative z-[1] transition-transform duration-fast ease-out group-active:scale-95"
      />
      {badge.type === 'dot' ? (
        <span
          aria-hidden
          className="absolute right-0.5 top-0.5 z-[2] h-2 w-2 rounded-radius-circular bg-red-500 ring-2 ring-app-card"
        />
      ) : null}
      {badge.type === 'count' ? (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 z-[2] inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-radius-circular bg-red-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-app-card"
        >
          {badge.label}
        </span>
      ) : null}
    </button>
  );
}
