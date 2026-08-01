import PageContainer from '../layout/PageContainer';
import TopBar from '../layout/TopBar';
import EmptyState from '../common/EmptyState';
import FetchErrorBanner from '../common/FetchErrorBanner';
import ConversationListItem from './ConversationListItem';
import ConversationListSkeleton from './ConversationListSkeleton';
import MessageSearchField from './MessageSearchField';
import MessagesChatIcon from './MessagesChatIcon';
import { useConversations } from '../../hooks/useConversations';
import { useConversationSearch } from '../../hooks/useConversationSearch';
import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';

export default function MessagesInboxView({ role }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const { conversations, loading, error, refetch } = useConversations();
  const {
    isSearching,
    results,
    loading: searchLoading,
    loadingMore: searchLoadingMore,
    error: searchError,
    hasMore: searchHasMore,
    loadMore: loadMoreSearch,
  } = useConversationSearch(query);

  const listLoading = isSearching ? searchLoading : loading;
  const listError = isSearching ? searchError : error;
  const listItems = isSearching ? results : conversations;

  return (
    <PageContainer
      className="bg-app-card"
      contentClassName="bg-app-card"
      topBar={<TopBar title="Mensajes" backButton />}
      bottomNav={false}
    >
      <div className="min-h-full bg-app-card">
        <div className="border-b border-app-divider px-space-base py-space-sm">
          <MessageSearchField
            value={query}
            onChange={setQuery}
            onClear={() => setQuery('')}
            placeholder="Buscar conversaciones"
          />
        </div>

        {listLoading ? <ConversationListSkeleton /> : null}

        {!listLoading && listError ? (
          <div className="p-space-base">
            <FetchErrorBanner
              message={listError}
              onRetry={isSearching ? () => setQuery(query) : refetch}
            />
          </div>
        ) : null}

        {!listLoading && !listError && !isSearching && conversations.length === 0 ? (
          <EmptyState
            icon={MessagesChatIcon}
            title="Aún no tienes conversaciones."
            description="Cuando envíes o recibas un mensaje, aparecerá aquí."
          />
        ) : null}

        {!listLoading && !listError && isSearching && results.length === 0 ? (
          <EmptyState
            variant="text"
            title="Sin resultados"
            description="No encontramos conversaciones que coincidan con tu búsqueda."
          />
        ) : null}

        {!listLoading && !listError && listItems.length > 0 ? (
          <div className="motion-list mx-auto w-full max-w-lg md:max-w-2xl lg:max-w-3xl">
            {listItems.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                role={role}
                currentUserId={user?.id}
              />
            ))}
          </div>
        ) : null}

        {isSearching && !searchLoading && searchHasMore ? (
          <button
            type="button"
            onClick={loadMoreSearch}
            disabled={searchLoadingMore}
            className="w-full px-space-base py-space-sm text-center text-caption font-medium text-primary-600 hover:text-primary-700 disabled:opacity-60"
          >
            {searchLoadingMore ? 'Cargando…' : 'Ver más'}
          </button>
        ) : null}
      </div>
    </PageContainer>
  );
}
