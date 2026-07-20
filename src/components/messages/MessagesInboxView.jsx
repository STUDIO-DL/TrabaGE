import PageContainer from '../layout/PageContainer';
import TopBar from '../layout/TopBar';
import EmptyState from '../common/EmptyState';
import FetchErrorBanner from '../common/FetchErrorBanner';
import ConversationListItem from './ConversationListItem';
import ConversationListSkeleton from './ConversationListSkeleton';
import { MessageSquare } from '../../constants/icons';
import { useConversations } from '../../hooks/useConversations';
import { useAuth } from '../../hooks/useAuth';

export default function MessagesInboxView({ role }) {
  const { user } = useAuth();
  const { conversations, loading, error, refetch } = useConversations();

  return (
    <PageContainer topBar={<TopBar title="Mensajes" backButton />} bottomNav={false}>
      {loading ? <ConversationListSkeleton /> : null}

      {!loading && error ? (
        <div className="p-space-base">
          <FetchErrorBanner message={error} onRetry={refetch} />
        </div>
      ) : null}

      {!loading && !error && conversations.length === 0 ? (
        <EmptyState
          variant="soft"
          icon={MessageSquare}
          title="Sin conversaciones"
          description="Cuando envíes o recibas un mensaje, aparecerá aquí."
        />
      ) : null}

      {!loading && !error && conversations.length > 0 ? (
        <div className="divide-y divide-app-border">
          {conversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              role={role}
              currentUserId={user?.id}
            />
          ))}
        </div>
      ) : null}
    </PageContainer>
  );
}
