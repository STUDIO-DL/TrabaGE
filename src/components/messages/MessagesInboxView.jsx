import { useState } from 'react';
import PageContainer from '../layout/PageContainer';
import TopBar from '../layout/TopBar';
import EmptyState from '../common/EmptyState';
import FetchErrorBanner from '../common/FetchErrorBanner';
import ConversationListItem from './ConversationListItem';
import ConversationListSkeleton from './ConversationListSkeleton';
import MessageSearchField from './MessageSearchField';
import { useConversations } from '../../hooks/useConversations';
import { useConversationSearch } from '../../hooks/useConversationSearch';
import { useAuth } from '../../hooks/useAuth';

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
    <PageContainer topBar={<TopBar title="Mensajes" backButton />} bottomNav={false}>
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
          variant="text"
          title="Sin conversaciones"
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
        <div className="divide-y divide-app-border">
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
    </PageContainer>
  );
}
