import MessageSearchHighlight from './MessageSearchHighlight';
import { formatMessageSearchTime } from '../../utils/messageSearch';

/**
 * Results panel for in-conversation message search.
 */
export default function ConversationMessageSearchPanel({
  query,
  onQueryChange,
  onClose,
  results,
  loading,
  loadingMore,
  error,
  hasMore,
  onLoadMore,
  onSelect,
  currentUserId,
  otherName,
  messagesEmpty = false,
}) {
  const trimmed = query.trim();

  return (
    <div className="absolute inset-x-0 top-0 z-20 flex max-h-[min(70%,28rem)] flex-col border-b border-app-divider bg-app-card shadow-elevation-2">
      <div className="flex shrink-0 items-center gap-space-sm border-b border-app-divider px-space-md py-space-sm">
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar en esta conversación"
          autoFocus
          autoComplete="off"
          className="h-10 min-w-0 flex-1 rounded-radius-md border border-app-border bg-app-surface px-space-md text-body-small text-app-text outline-none placeholder:text-app-subtle focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        />
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-body-small font-medium text-primary-600 hover:text-primary-700"
        >
          Cerrar
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {!trimmed ? (
          <p className="px-space-md py-space-base text-caption text-app-muted">
            Escribe para buscar mensajes en esta conversación.
          </p>
        ) : null}

        {trimmed && loading ? (
          <div className="space-y-space-sm p-space-md" aria-busy="true">
            <div className="h-12 animate-pulse rounded-radius-md bg-app-surface" />
            <div className="h-12 animate-pulse rounded-radius-md bg-app-surface" />
            <div className="h-12 animate-pulse rounded-radius-md bg-app-surface" />
          </div>
        ) : null}

        {trimmed && !loading && error ? (
          <div className="space-y-space-sm p-space-md">
            <p className="text-body-small text-app-text">No hemos podido realizar la búsqueda.</p>
            <p className="text-caption text-app-muted">Revisa tu conexión y vuelve a intentarlo.</p>
          </div>
        ) : null}

        {trimmed && !loading && !error && results.length === 0 ? (
          <p className="px-space-md py-space-base text-body-small text-app-muted">
            {messagesEmpty
              ? 'Todavía no hay mensajes.'
              : 'No encontramos mensajes que coincidan con tu búsqueda.'}
          </p>
        ) : null}

        {trimmed && !loading && !error && results.length > 0
          ? results.map((item) => {
              const isOwn = item.senderId === currentUserId;
              const senderLabel = isOwn ? 'Tú' : otherName || 'Mensaje';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="flex w-full flex-col gap-0.5 border-b border-app-divider px-space-md py-space-sm text-left transition-colors hover:bg-app-surface"
                >
                  <div className="flex items-center justify-between gap-space-sm">
                    <span className="truncate text-caption font-medium text-app-text">{senderLabel}</span>
                    <span className="shrink-0 text-caption text-app-subtle">
                      {formatMessageSearchTime(item.createdAt)}
                    </span>
                  </div>
                  <MessageSearchHighlight
                    text={item.snippet || item.content}
                    query={query}
                    className="line-clamp-2 text-body-small text-app-muted"
                  />
                </button>
              );
            })
          : null}

        {trimmed && !loading && hasMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="w-full px-space-md py-space-sm text-center text-caption font-medium text-primary-600 hover:text-primary-700 disabled:opacity-60"
          >
            {loadingMore ? 'Cargando…' : 'Ver más'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
