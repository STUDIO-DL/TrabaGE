import NotificationsView from '../../components/notifications/NotificationsView';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';

export default function Notifications() {
  const { role } = useAuth();
  return <NotificationsView role={role ?? ROLES.PERSONAL} />;
}
