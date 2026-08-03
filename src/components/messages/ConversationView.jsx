import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../layout/PageContainer';
import TopBar from '../layout/TopBar';
import AppAvatar from '../common/AppAvatar';
import AppIcon from '../common/AppIcon';
import FetchErrorBanner from '../common/FetchErrorBanner';
import Skeleton from '../common/Skeleton';
import MessageBubble, { messageHasCopyableText } from './MessageBubble';
import MessageComposer from './MessageComposer';
import ChatWallpaper from './ChatWallpaper';
import MessageDaySeparator from './MessageDaySeparator';
import MessageSelectionBar from './MessageSelectionBar';
import DeleteMessageSheet from './DeleteMessageSheet';
import ConversationMessageSearchPanel from './ConversationMessageSearchPanel';
import EphemeralMessagesBanner from './EphemeralMessagesBanner';
import KeyboardAwareFooter from '../layout/KeyboardAwareFooter';
import { useMessages } from '../../hooks/useMessages';
import { useMessageSelection } from '../../hooks/useMessageSelection';
import { useConversationMessageSearch } from '../../hooks/useConversationMessageSearch';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { isEmployerRole } from '../../constants/roles';
import { Search, ICON_SIZES } from '../../constants/icons';
import { messagesService, MESSAGE_WAIT_FOR_REPLY } from '../../services/messages.service';
import { getMessageDayKey } from '../../utils/formatDate';
import { copyToClipboard } from '../../utils/shareContent';
import { triggerLightHaptic } from '../../utils/hapticFeedback';

const BOTTOM_THRESHOLD = 50;
const COMPOSE_INSET_FALLBACK = 72;

function ConversationSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-space-md p-space-base" aria-busy="true">
      <div className="flex justify-start">
        <Skeleton className="h-16 w-[70%] rounded-radius-lg" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-14 w-[60%] rounded-radius-lg" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-12 w-[55%] rounded-radius-lg" />
      </div>
    </div>
  );
}

export default function ConversationView({ conversationId, role: _role, embedded = false }) {
  const { user } = useAuth();
  const { showToast, showErrorToast } = useNotificationContext();
  const scrollRef = useRef(null);
  const composeRef = useRef(null);
  const bottomAnchorRef = useRef(null);
  const topSentinelRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const [composeInset, setComposeInset] = useState(COMPOSE_INSET_FALLBACK);
  const [replyTarget, setReplyTarget] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const highlightTimerRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayParticipant, setDisplayParticipant] = useState(null);
  const [participantLoading, setParticipantLoading] = useState(true);
  const {
    messages,
    otherLastReadAt,
    loading,
    loadingMore,
    hasMore,
    error,
    sending,
    canSend,
    blockedReason,
    sendMessage,
    deleteMessage,
    loadMore,
    ensureMessageLoaded,
    refetch,
  } = useMessages(conversationId);
  const selection = useMessageSelection({ conversationId });
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const {
    results: searchResults,
    loading: searchLoading,
    loadingMore: searchLoadingMore,
    error: searchError,
    hasMore: searchHasMore,
    loadMore: loadMoreSearch,
  } = useConversationMessageSearch(conversationId, searchOpen ? searchQuery : '');

  useEffect(() => {
    if (!conversationId || !user?.id) {
      setDisplayParticipant(null);
      setParticipantLoading(false);
      return undefined;
    }

    let cancelled = false;
    setParticipantLoading(true);

    const loadParticipant = async () => {
      const { data: participants } = await messagesService.getConversationParticipants(conversationId);
      const otherUserId = (participants ?? []).find((row) => row.user_id !== user.id)?.user_id;
      if (!otherUserId || cancelled) {
        if (!cancelled) {
          setDisplayParticipant(null);
          setParticipantLoading(false);
        }
        return;
      }

      const { data } = await messagesService.getParticipantSummaries([otherUserId]);
      if (!cancelled) {
        setDisplayParticipant(data?.[0] ?? null);
        setParticipantLoading(false);
      }
    };

    void loadParticipant();

    return () => {
      cancelled = true;
    };
  }, [conversationId, user?.id]);

  const profilePath = displayParticipant?.userId
    ? isEmployerRole(displayParticipant.role)
      ? `/companies/${displayParticipant.userId}`
      : `/profile/${displayParticipant.userId}`
    : null;

  const checkIsAtBottom = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return true;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    return distance <= BOTTOM_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback((behavior = 'auto') => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    const node = composeRef.current;
    if (!node) return undefined;

    const measure = () => {
      setComposeInset(node.getBoundingClientRect().height || COMPOSE_INSET_FALLBACK);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, blockedReason, canSend, error, replyTarget]);

  useEffect(() => {
    setReplyTarget(null);
    setHighlightedMessageId(null);
    setSearchOpen(false);
    setSearchQuery('');
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
  }, [conversationId]);

  useEffect(
    () => () => {
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || loading) return undefined;

    const handleScroll = () => {
      isAtBottomRef.current = checkIsAtBottom();
    };

    handleScroll();
    node.addEventListener('scroll', handleScroll, { passive: true });
    return () => node.removeEventListener('scroll', handleScroll);
  }, [loading, checkIsAtBottom]);

  useEffect(() => {
    if (loading) return;
    isAtBottomRef.current = true;
    requestAnimationFrame(() => {
      scrollToBottom('auto');
      requestAnimationFrame(() => scrollToBottom('auto'));
    });
  }, [conversationId, loading, scrollToBottom]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || loading || loadingMore) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    const shouldStickToBottom =
      lastMessage.sender_id === user?.id ||
      lastMessage.optimistic ||
      isAtBottomRef.current;

    if (shouldStickToBottom) {
      isAtBottomRef.current = true;
      requestAnimationFrame(() => {
        scrollToBottom('auto');
        requestAnimationFrame(() => scrollToBottom('auto'));
      });
    }
  }, [loading, loadingMore, messages, user?.id, scrollToBottom]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    const handleViewportChange = () => {
      if (!isAtBottomRef.current) return;
      requestAnimationFrame(() => scrollToBottom('auto'));
    };

    vv.addEventListener('resize', handleViewportChange);
    vv.addEventListener('scroll', handleViewportChange);
    return () => {
      vv.removeEventListener('resize', handleViewportChange);
      vv.removeEventListener('scroll', handleViewportChange);
    };
  }, [scrollToBottom]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { root: scrollRef.current, threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const resolveReplyAuthorName = useCallback(
    (senderId) => {
      if (!senderId) return 'Mensaje';
      if (senderId === user?.id) return 'Tú';
      if (senderId === displayParticipant?.userId) return displayParticipant.name || 'Mensaje';
      return 'Mensaje';
    },
    [displayParticipant?.name, displayParticipant?.userId, user?.id],
  );

  const handleReply = useCallback(
    (message) => {
      if (!message?.id || message.optimistic) return;
      setReplyTarget({
        id: message.id,
        content: message.content,
        sender_id: message.sender_id,
        created_at: message.created_at,
        authorName: resolveReplyAuthorName(message.sender_id),
      });
    },
    [resolveReplyAuthorName],
  );

  const handleCancelReply = useCallback(() => {
    setReplyTarget(null);
  }, []);

  const highlightMessageInView = useCallback((messageId) => {
    const target = scrollRef.current?.querySelector(`[data-message-id="${messageId}"]`);
    if (!target) return false;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(messageId);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedMessageId(null);
      highlightTimerRef.current = null;
    }, 1800);
    return true;
  }, []);

  const handleOpenReply = useCallback(
    async (replyToId) => {
      if (!replyToId || !scrollRef.current) return;

      if (highlightMessageInView(replyToId)) return;

      const status = await ensureMessageLoaded(replyToId);
      if (status === 'missing') {
        showToast('Este mensaje ya no está disponible.', 'info');
        return;
      }
      if (status === 'error') {
        showToast('No hemos podido abrir ese mensaje.', 'error');
        return;
      }

      requestAnimationFrame(() => {
        if (!highlightMessageInView(replyToId)) {
          showToast('Este mensaje ya no está disponible.', 'info');
        }
      });
    },
    [ensureMessageLoaded, highlightMessageInView, showToast],
  );

  const handleSelectSearchResult = useCallback(
    async (item) => {
      if (!item?.id) return;

      setSearchOpen(false);

      const status = await ensureMessageLoaded(item.id);
      if (status === 'missing') {
        showToast('Este mensaje ya no está disponible.', 'info');
        return;
      }
      if (status === 'error') {
        showToast('No hemos podido abrir ese mensaje.', 'error');
        return;
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!highlightMessageInView(item.id)) {
            showToast('Este mensaje ya no está disponible.', 'info');
          }
        });
      });
    },
    [ensureMessageLoaded, highlightMessageInView, showToast],
  );

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const selectedMessages = selection.selectedIdList
    .map((id) => messages.find((item) => item.id === id))
    .filter(Boolean);

  const canCopySelection =
    selectedMessages.length > 0 && selectedMessages.every((item) => messageHasCopyableText(item));

  const canDeleteSelection =
    selectedMessages.length > 0 &&
    selectedMessages.every((item) => item.sender_id === user?.id && !item.optimistic);

  const handleMessageLongPress = useCallback(
    (message) => {
      if (!message?.id || message.optimistic) return;
      if (searchOpen) setSearchOpen(false);
      setReplyTarget(null);
      selection.enter(message.id);
    },
    [searchOpen, selection],
  );

  const handleMessageSelectPress = useCallback(
    (message) => {
      if (!message?.id || message.optimistic) return;
      selection.toggle(message.id);
    },
    [selection],
  );

  const handleCopySelected = useCallback(async () => {
    if (!canCopySelection) return;
    const text = selectedMessages
      .map((item) => String(item.content ?? '').trim())
      .filter(Boolean)
      .join('\n\n');
    const ok = await copyToClipboard(text);
    if (ok) {
      triggerLightHaptic();
      showToast('Mensaje copiado', 'success');
      selection.clear();
    } else {
      showToast('No se pudo copiar el mensaje.', 'error');
    }
  }, [canCopySelection, selectedMessages, selection, showToast]);

  const handleRequestDelete = useCallback(() => {
    if (!canDeleteSelection) return;
    setDeleteSheetOpen(true);
  }, [canDeleteSelection]);

  const handleConfirmDelete = useCallback(async () => {
    if (!canDeleteSelection || deleting) return;
    setDeleting(true);
    const ids = selectedMessages.map((item) => item.id);
    let failed = false;
    for (const id of ids) {
      const result = await deleteMessage(id);
      if (result.error) {
        failed = true;
        showErrorToast(result.error, 'delete_message');
        break;
      }
    }
    setDeleting(false);
    setDeleteSheetOpen(false);
    if (!failed) {
      triggerLightHaptic();
      showToast(ids.length > 1 ? 'Mensajes eliminados' : 'Mensaje eliminado', 'success');
      selection.clear();
    }
  }, [canDeleteSelection, deleteMessage, deleting, selectedMessages, selection, showErrorToast, showToast]);

  const handleSend = async (content, options = {}) => {
    isAtBottomRef.current = true;
    const result = await sendMessage(content, options);
    if (result.error) {
      showErrorToast(result.error, 'send_message');
    } else {
      setReplyTarget(null);
      requestAnimationFrame(() => {
        scrollToBottom('auto');
        requestAnimationFrame(() => scrollToBottom('auto'));
      });
    }
    return result;
  };

  const headerCenter = displayParticipant ? (
    profilePath ? (
      <Link to={profilePath} className="flex min-w-0 flex-1 items-center gap-space-sm">
        <AppAvatar
          type={displayParticipant.avatarType}
          src={displayParticipant.avatarSrc}
          name={displayParticipant.name}
          alt={displayParticipant.name}
          size="sm"
          variant={displayParticipant.avatarVariant ?? 'circular'}
          className="shrink-0"
        />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-subtitle font-semibold text-app-text">{displayParticipant.name}</span>
          {displayParticipant.subtitle ? (
            <span className="truncate text-caption text-app-subtle">{displayParticipant.subtitle}</span>
          ) : null}
        </div>
      </Link>
    ) : (
      <div className="flex min-w-0 flex-1 items-center gap-space-sm">
        <AppAvatar
          type={displayParticipant.avatarType}
          src={displayParticipant.avatarSrc}
          name={displayParticipant.name}
          alt={displayParticipant.name}
          size="sm"
          variant={displayParticipant.avatarVariant ?? 'circular'}
          className="shrink-0"
        />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-subtitle font-semibold text-app-text">{displayParticipant.name}</span>
          {displayParticipant.subtitle ? (
            <span className="truncate text-caption text-app-subtle">{displayParticipant.subtitle}</span>
          ) : null}
        </div>
      </div>
    )
  ) : participantLoading ? (
    <Skeleton className="h-5 w-32" />
  ) : (
    <span className="truncate text-subtitle font-semibold text-app-text">Conversación</span>
  );

  const searchAction = selection.isActive ? null : (
    <button
      type="button"
      onClick={() => setSearchOpen((open) => !open)}
      className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-sm text-app-muted transition-colors hover:bg-app-surface hover:text-primary-600"
      aria-label="Buscar en esta conversación"
      aria-pressed={searchOpen}
    >
      <AppIcon icon={Search} size={ICON_SIZES.md} />
    </button>
  );

  const selectionBar = (
    <MessageSelectionBar
      selectedCount={selection.selectedCount}
      canCopy={canCopySelection}
      canDelete={canDeleteSelection}
      onCancel={selection.clear}
      onCopy={handleCopySelected}
      onDelete={handleRequestDelete}
    />
  );

  const thread = (
      <ChatWallpaper>
        {searchOpen && !selection.isActive ? (
          <ConversationMessageSearchPanel
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onClose={handleCloseSearch}
            results={searchResults}
            loading={searchLoading}
            loadingMore={searchLoadingMore}
            error={searchError}
            hasMore={searchHasMore}
            onLoadMore={loadMoreSearch}
            onSelect={handleSelectSearchResult}
            currentUserId={user?.id}
            otherName={displayParticipant?.name}
            messagesEmpty={!loading && messages.length === 0}
          />
        ) : null}

        {!searchOpen ? <EphemeralMessagesBanner /> : null}

        {error ? (
          <div className="shrink-0 bg-white p-space-base dark:bg-app-card">
            <FetchErrorBanner message={error} onRetry={refetch} />
          </div>
        ) : null}

        {loading ? <ConversationSkeleton /> : null}

        {!loading ? (
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-transparent px-space-base py-space-md"
            data-no-pull-refresh
            style={embedded ? undefined : { paddingBottom: composeInset }}
          >
            <div ref={topSentinelRef} className="h-px w-full" aria-hidden="true" />
            {loadingMore ? (
              <p className="mb-space-md text-center text-caption text-app-subtle">Cargando mensajes…</p>
            ) : null}
            {!loadingMore && hasMore ? (
              <p className="mb-space-md text-center text-caption text-app-subtle">Desplázate para ver anteriores</p>
            ) : null}

            {!messages.length ? (
              <p className="py-space-xl text-center text-body-small text-app-muted">
                Todavía no hay mensajes.
              </p>
            ) : null}

            <div className="flex flex-col gap-space-md">
              {messages.map((message, index) => {
                const isOwn = message.sender_id === user?.id;
                const isRead =
                  isOwn &&
                  otherLastReadAt &&
                  new Date(otherLastReadAt) >= new Date(message.created_at);
                const previousMessage = messages[index - 1];
                const showAvatar = !isOwn && (!previousMessage || previousMessage.sender_id !== message.sender_id);
                const replyAuthorName = resolveReplyAuthorName(message.reply_to?.sender_id);
                const dayKey = getMessageDayKey(message.created_at);
                const previousDayKey = previousMessage
                  ? getMessageDayKey(previousMessage.created_at)
                  : null;
                const showDaySeparator = Boolean(dayKey) && dayKey !== previousDayKey;

                return (
                  <div key={message.id} className="flex flex-col gap-space-md">
                    {showDaySeparator ? <MessageDaySeparator date={message.created_at} /> : null}
                    <MessageBubble
                      message={message}
                      isOwn={isOwn}
                      isRead={Boolean(isRead)}
                      avatar={showAvatar ? displayParticipant : null}
                      showAvatar={showAvatar}
                      replyAuthorName={replyAuthorName}
                      highlighted={highlightedMessageId === message.id}
                      selected={selection.isSelected(message.id)}
                      selectionActive={selection.isActive}
                      onReply={selection.isActive ? undefined : handleReply}
                      onOpenReply={selection.isActive ? undefined : handleOpenReply}
                      onLongPress={handleMessageLongPress}
                      onSelectPress={handleMessageSelectPress}
                    />
                  </div>
                );
              })}
            </div>
            <div ref={bottomAnchorRef} className="h-px w-full shrink-0" aria-hidden="true" />
          </div>
        ) : null}

        {!selection.isActive ? (
          <KeyboardAwareFooter fixed={!embedded} as="div">
            <div ref={composeRef}>
              <MessageComposer
                onSend={handleSend}
                sending={sending}
                disabled={loading || Boolean(error) || !canSend}
                blockedReason={!canSend ? (blockedReason ?? MESSAGE_WAIT_FOR_REPLY) : null}
                replyTarget={replyTarget}
                onCancelReply={handleCancelReply}
              />
            </div>
          </KeyboardAwareFooter>
        ) : (
          <div ref={composeRef} className="hidden" aria-hidden />
        )}

        <DeleteMessageSheet
          isOpen={deleteSheetOpen}
          onClose={() => {
            if (!deleting) setDeleteSheetOpen(false);
          }}
          onConfirm={handleConfirmDelete}
          loading={deleting}
          count={selectedMessages.length}
        />
      </ChatWallpaper>
  );

  if (embedded) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--chat-wallpaper-bg)] transition-[background-color] duration-[250ms]">
        {selection.isActive ? (
          selectionBar
        ) : (
          <header className="flex shrink-0 items-center gap-space-sm border-b border-app-divider bg-app-card px-space-md py-space-sm">
            {headerCenter}
            <div className="ml-auto shrink-0">{searchAction}</div>
          </header>
        )}
        {thread}
      </div>
    );
  }

  return (
    <PageContainer
      topBar={
        selection.isActive ? (
          selectionBar
        ) : (
          <TopBar backButton center={headerCenter} actions={searchAction} />
        )
      }
      bottomNav={false}
      className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-[var(--chat-wallpaper-bg)] transition-[background-color] duration-[250ms]"
      contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--chat-wallpaper-bg)] transition-[background-color] duration-[250ms]"
    >
      {thread}
    </PageContainer>
  );
}
