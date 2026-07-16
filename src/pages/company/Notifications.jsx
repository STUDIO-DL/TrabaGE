import NotificationsView from '../../components/notifications/NotificationsView';
import { useAuth } from '../../hooks/useAuth';

export default function Notifications() {
  const { role } = useAuth();
  return <NotificationsView role={role} />;
}
