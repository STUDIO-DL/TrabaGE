import PageContainer from '../../components/layout/PageContainer';
import NotificationItem from '../../components/notifications/NotificationItem';
import EmptyState from '../../components/common/EmptyState';
import { NotificationListSkeleton } from '../../components/common/Skeleton';
import { NoNotifications } from '../../assets/empty-states';
import Button from '../../components/ui/Button';
import { useNotifications } from '../../hooks/useNotifications';

export default function Notifications() {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

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
            <NotificationItem key={n.id} notification={n} onClick={(item) => markAsRead(item.id)} />
          ))
        )}
      </div>
    </PageContainer>
  );
}
