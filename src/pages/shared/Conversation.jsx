import { useParams } from 'react-router-dom';
import ConversationView from '../../components/messages/ConversationView';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';

export default function Conversation() {
  const { conversationId } = useParams();
  const { role } = useAuth();

  return (
    <ConversationView
      conversationId={conversationId}
      role={role ?? ROLES.PERSONAL}
    />
  );
}
