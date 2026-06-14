import PageContainer from '../../components/layout/PageContainer';
import NotificationItem from '../../components/notifications/NotificationItem';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
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
          <Spinner fullscreen />
        ) : notifications.length === 0 ? (
          <EmptyState
            image="/images/no-notifications.png"
            title="Sin notificaciones"
            description="Te avisaremos cuando haya novedades."
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
