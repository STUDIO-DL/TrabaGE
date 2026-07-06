import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import NotificationItem from '../../components/notifications/NotificationItem';
import EmptyState from '../../components/common/EmptyState';
import { NotificationListSkeleton } from '../../components/common/Skeleton';
import { Bell } from '../../constants/icons';
import Button from '../../components/ui/Button';
import { useNotifications } from '../../hooks/useNotifications';
import { usePushPermission } from '../../hooks/usePushPermission';
import { useNotificationContext } from '../../context/NotificationContext';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

export default function Notifications() {
  usePushPermission();
  const navigate = useNavigate();
  const { showToast } = useNotificationContext();
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const handleClick = async (notification) => {
    await markAsRead(notification.id);
    if (notification.metadata?.link) navigate(notification.metadata.link);
  };

  const handleDelete = async (notification) => {
    const { error } = await deleteNotification(notification.id);
    showToast(error ? getSupabaseErrorMessage(error) : 'Notificación eliminada', error ? 'error' : 'success');
  };

  return (
    <PageContainer
      title="Notificaciones"
      actions={
        notifications.length > 0 && (
          <Button size="sm" variant="ghost" onClick={markAllAsRead}>
            Marcar todo
          </Button>
        )
      }
    >
      <div className="p-4">
        {loading ? (
          <NotificationListSkeleton count={5} />
        ) : notifications.length === 0 ? (
          <EmptyState
            variant="soft"
            icon={Bell}
            title="No tienes notificaciones"
            description="Cuando recibas notificaciones importantes, las verás aquí."
          />
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onClick={handleClick}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </PageContainer>
  );
}
