import { useParams } from 'react-router-dom';
import MessagesWorkspace from '../../components/messages/MessagesWorkspace';

export default function Conversation() {
  const { conversationId } = useParams();
  return <MessagesWorkspace conversationId={conversationId} />;
}
