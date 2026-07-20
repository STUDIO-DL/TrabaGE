import MessagesInboxView from '../../components/messages/MessagesInboxView';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';

export default function MessagesInbox() {
  const { role } = useAuth();
  return <MessagesInboxView role={role ?? ROLES.PERSONAL} />;
}
