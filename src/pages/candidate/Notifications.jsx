import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import NotificationItem from '../../components/notifications/NotificationItem';
import EmptyState from '../../components/common/EmptyState';
import { NotificationListSkeleton } from '../../components/common/Skeleton';
import { NoNotifications } from '../../assets/empty-states';
import Button from '../../components/ui/Button';
import { useNotifications } from '../../hooks/useNotifications';
import { usePushPermission } from '../../hooks/usePushPermission';
import { useAuth } from '../../hooks/useAuth';
import { analyticsService } from '../../services/analytics.service';
import { useNotificationContext } from '../../context/NotificationContext';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

export default function Notifications() {
  usePushPermission();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotificationContext();
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const handleNotificationClick = async (notification) => {
    await markAsRead(notification.id);

    if (notification.type === 'job_recommendation' && notification.metadata?.job_id && user?.id) {
      analyticsService.trackNotificationOpened(user.id, notification.metadata.job_id, {
        notification_id: notification.id,
        score: notification.metadata?.score,
      });
    }

    const link = notification.metadata?.link;
    if (link) {
      navigate(link);
    }
  };

  const handleDeleteNotification = async (notification) => {
    const { error } = await deleteNotification(notification.id);
    showToast(error ? getSupabaseErrorMessage(error) : 'Notificación eliminada', error ? 'error' : 'success');
  };

  return (
    <PageContainer
      title="Notificaciones"
      actions={
        notifications.length > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
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
            image={NoNotifications}
            title="No tienes notificaciones"
            description="Cuando recibas notificaciones importantes, las verás aquí."
          />
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onClick={handleNotificationClick}
              onDelete={handleDeleteNotification}
            />
          ))
        )}
      </div>
    </PageContainer>
  );
}
