import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../layout/PageContainer';
import TopBar from '../layout/TopBar';
import AppAvatar from '../common/AppAvatar';
import AppIcon from '../common/AppIcon';
import FetchErrorBanner from '../common/FetchErrorBanner';
import Skeleton from '../common/Skeleton';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import MessageDaySeparator from './MessageDaySeparator';
import ConversationMessageSearchPanel from './ConversationMessageSearchPanel';
import KeyboardAwareFooter from '../layout/KeyboardAwareFooter';
import { useMessages } from '../../hooks/useMessages';
import { useConversations } from '../../hooks/useConversations';
import { useConversationMessageSearch } from '../../hooks/useConversationMessageSearch';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { isEmployerRole } from '../../constants/roles';
import { Search, ICON_SIZES } from '../../constants/icons';
import { messagesService, MESSAGE_WAIT_FOR_REPLY } from '../../services/messages.service';
import { getMessageDayKey } from '../../utils/formatDate';

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

export default function ConversationView({ conversationId, role, embedded = false }) {
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
  const {
    conversations,
    loading: conversationsLoading,
  } = useConversations();
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
    loadMore,
    ensureMessageLoaded,
    refetch,
  } = useMessages(conversationId);
  const {
    results: searchResults,
    loading: searchLoading,
    loadingMore: searchLoadingMore,
    error: searchError,
    hasMore: searchHasMore,
    loadMore: loadMoreSearch,
  } = useConversationMessageSearch(conversationId, searchOpen ? searchQuery : '');

  const otherParticipant = useMemo(() => {
    const match = conversations.find((item) => item.id === conversationId);
    return match?.otherParticipant ?? null;
  }, [conversationId, conversations]);
  const [fallbackParticipant, setFallbackParticipant] = useState(null);

  useEffect(() => {
    if (otherParticipant || !conversationId || !user?.id) return undefined;

    let cancelled = false;

    const loadParticipant = async () => {
      const { data: participants } = await messagesService.getConversationParticipants(conversationId);
      const otherUserId = (participants ?? []).find((row) => row.user_id !== user.id)?.user_id;
      if (!otherUserId || cancelled) return;

      const { data } = await messagesService.getParticipantSummaries([otherUserId]);
      if (!cancelled) {
        setFallbackParticipant(data?.[0] ?? null);
      }
    };

    void loadParticipant();

    return () => {
      cancelled = true;
    };
  }, [conversationId, otherParticipant, user?.id]);

  const displayParticipant = otherParticipant ?? fallbackParticipant;

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

  const handleOpenReply = useCallback(
    (replyToId) => {
      if (!replyToId || !scrollRef.current) return;

      const target = scrollRef.current.querySelector(`[data-message-id="${replyToId}"]`);
      if (!target) {
        showToast('Ese mensaje no está cargado todavía. Desplázate hacia arriba para verlo.', 'info');
        return;
      }

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(replyToId);
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightedMessageId(null);
        highlightTimerRef.current = null;
      }, 1600);
    },
    [showToast],
  );

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
  ) : conversationsLoading ? (
    <Skeleton className="h-5 w-32" />
  ) : (
    <span className="truncate text-subtitle font-semibold text-app-text">Conversación</span>
  );

  const searchAction = (
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

  const thread = (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {searchOpen ? (
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

        {error ? (
          <div className="shrink-0 p-space-base">
            <FetchErrorBanner message={error} onRetry={refetch} />
          </div>
        ) : null}

        {loading ? <ConversationSkeleton /> : null}

        {!loading ? (
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-space-base py-space-md"
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
                      onReply={handleReply}
                      onOpenReply={handleOpenReply}
                    />
                  </div>
                );
              })}
            </div>
            <div ref={bottomAnchorRef} className="h-px w-full shrink-0" aria-hidden="true" />
          </div>
        ) : null}

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
      </div>
  );

  if (embedded) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-app-card">
        <header className="flex shrink-0 items-center gap-space-sm border-b border-app-divider px-space-md py-space-sm">
          {headerCenter}
          <div className="ml-auto shrink-0">{searchAction}</div>
        </header>
        {thread}
      </div>
    );
  }

  return (
    <PageContainer
      topBar={<TopBar backButton center={headerCenter} actions={searchAction} />}
      bottomNav={false}
      className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden"
      contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      {thread}
    </PageContainer>
  );
}
