import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useConversations } from '../../hooks/useConversations';
import { useConversationSearch } from '../../hooks/useConversationSearch';
import { ROLES } from '../../constants/roles';
import ConversationListItem from './ConversationListItem';
import ConversationListSkeleton from './ConversationListSkeleton';
import ConversationView from './ConversationView';
import MessagesInboxView from './MessagesInboxView';
import MessageSearchField from './MessageSearchField';
import EmptyState from '../common/EmptyState';
import FetchErrorBanner from '../common/FetchErrorBanner';
import MessagesChatIcon from './MessagesChatIcon';
import AppSidebar from '../layout/AppSidebar';

const DESKTOP_MQ = '(min-width: 1024px)';

function useIsDesktopMessages() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(DESKTOP_MQ).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  return isDesktop;
}

function ConversationListPanel({ role, activeId, query, onQueryChange }) {
  const { user } = useAuth();
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
  const showEmptyInbox = !isSearching && !loading && !error && conversations.length === 0;
  const showEmptySearch =
    isSearching && !searchLoading && !searchError && results.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-app-divider px-space-md py-space-md">
        <h1 className="text-title font-semibold tracking-tight text-app-text">Mensajes</h1>
        <MessageSearchField
          className="mt-space-sm"
          value={query}
          onChange={onQueryChange}
          onClear={() => onQueryChange('')}
          placeholder="Buscar conversaciones"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {listLoading ? <ConversationListSkeleton /> : null}

        {!listLoading && listError ? (
          <div className="p-space-md">
            <FetchErrorBanner
              message={listError}
              onRetry={isSearching ? () => onQueryChange(query) : refetch}
            />
          </div>
        ) : null}

        {showEmptyInbox ? (
          <EmptyState
            icon={MessagesChatIcon}
            title="Aún no tienes conversaciones."
            description="Cuando envíes o recibas un mensaje, aparecerá aquí."
          />
        ) : null}

        {showEmptySearch ? (
          <EmptyState
            variant="text"
            title="Sin resultados"
            description="No encontramos conversaciones que coincidan con tu búsqueda."
          />
        ) : null}

        {!listLoading && !listError && listItems.length > 0
          ? listItems.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                role={role}
                currentUserId={user?.id}
                active={conversation.id === activeId}
              />
            ))
          : null}

        {isSearching && !searchLoading && searchHasMore ? (
          <button
            type="button"
            onClick={loadMoreSearch}
            disabled={searchLoadingMore}
            className="w-full px-space-md py-space-sm text-center text-caption font-medium text-primary-600 hover:text-primary-700 disabled:opacity-60"
          >
            {searchLoadingMore ? 'Cargando…' : 'Ver más'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Mobile: existing single-column inbox / conversation.
 * Desktop (lg+): WhatsApp/LinkedIn-style two-column workspace.
 */
export default function MessagesWorkspace({ conversationId = null }) {
  const { role } = useAuth();
  const resolvedRole = role ?? ROLES.PERSONAL;
  const isDesktop = useIsDesktopMessages();
  const [query, setQuery] = useState('');

  if (!isDesktop) {
    if (conversationId) {
      return <ConversationView conversationId={conversationId} role={resolvedRole} />;
    }
    return <MessagesInboxView role={resolvedRole} />;
  }

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 overflow-hidden bg-app-surface">
      <AppSidebar />
      <aside className="flex w-[min(100%,22rem)] shrink-0 flex-col border-r border-app-border bg-app-card">
        <ConversationListPanel
          role={resolvedRole}
          activeId={conversationId}
          query={query}
          onQueryChange={setQuery}
        />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-app-bg">
        {conversationId ? (
          <ConversationView conversationId={conversationId} role={resolvedRole} embedded />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              variant="text"
              icon={MessagesChatIcon}
              title="Selecciona una conversación"
              description="Elige un chat de la lista para leer y responder."
            />
          </div>
        )}
      </main>
    </div>
  );
}
