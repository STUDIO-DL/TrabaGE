import { useCallback, useEffect, useState } from 'react';
import BottomSheet from '../../../components/ui/BottomSheet';
import Button from '../../../components/ui/Button';
import Textarea from '../../../components/ui/Textarea';
import Spinner from '../../../components/ui/Spinner';
import { postEngagementService } from '../data/postEngagement.service';
import { COMMENTS_PAGE_SIZE, REPLIES_PAGE_SIZE } from '../domain/constants';
import CommentItem from './CommentItem';
import { useAuth } from '../../../hooks/useAuth';
import { useNotificationContext } from '../../../context/NotificationContext';
import { notifyGuestBlocked } from '../../../utils/guestMode';
import { getSupabaseErrorMessage } from '../../../utils/supabaseErrors';

export default function PostCommentsSheet({
  post,
  isOpen,
  onClose,
  onCommentsChange,
}) {
  const { user, isPreviewMode } = useAuth();
  const { showToast } = useNotificationContext();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [repliesMap, setRepliesMap] = useState({});
  const [repliesLoading, setRepliesLoading] = useState({});
  const [repliesLoadingMore, setRepliesLoadingMore] = useState({});
  const [repliesHasMore, setRepliesHasMore] = useState({});

  const loadComments = useCallback(
    async ({ append = false } = {}) => {
      if (!post?.id) return;
      if (append) setLoadingMore(true);
      else setLoading(true);

      const offset = append ? comments.length : 0;
      const { data, error } = await postEngagementService.listComments(post.id, {
        limit: COMMENTS_PAGE_SIZE,
        offset,
      });

      if (error) {
        showToast(getSupabaseErrorMessage(error, 'No se pudieron cargar los comentarios.'), 'error');
      } else {
        setComments((prev) => (append ? [...prev, ...(data ?? [])] : data ?? []));
        setHasMore((data ?? []).length >= COMMENTS_PAGE_SIZE);
      }

      setLoading(false);
      setLoadingMore(false);
    },
    [comments.length, post?.id, showToast],
  );

  useEffect(() => {
    if (!isOpen || !post?.id) return;
    setComments([]);
    setHasMore(true);
    setReplyTo(null);
    setBody('');
    setRepliesMap({});
    setRepliesHasMore({});
    setRepliesLoadingMore({});
    void loadComments({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, post?.id]);

  const handleSubmit = async () => {
    if (isPreviewMode || !user) {
      notifyGuestBlocked(showToast);
      return;
    }
    const trimmed = body.trim();
    if (!trimmed) return;

    setSubmitting(true);
    const { data, error } = await postEngagementService.createComment({
      postId: post.id,
      body: trimmed,
      parentId: replyTo?.id ?? null,
      actorId: user.id,
      postAuthorId: post.author_id,
      parentAuthorId: replyTo?.author_id ?? null,
    });
    setSubmitting(false);

    if (error) {
      showToast(getSupabaseErrorMessage(error, 'No se pudo publicar el comentario.'), 'error');
      return;
    }

    if (replyTo?.id) {
      setRepliesMap((prev) => ({
        ...prev,
        [replyTo.id]: [...(prev[replyTo.id] ?? []), data],
      }));
      setComments((prev) =>
        prev.map((c) =>
          c.id === replyTo.id
            ? { ...c, replies_count: (c.replies_count || 0) + 1 }
            : c,
        ),
      );
    } else {
      setComments((prev) => [...prev, data]);
    }

    setBody('');
    setReplyTo(null);
    onCommentsChange?.(1);
  };

  const handleLike = async (comment) => {
    if (isPreviewMode || !user) {
      notifyGuestBlocked(showToast);
      return;
    }

    const nextLiked = !comment.liked_by_me;
    const applyOptimistic = (list) =>
      list.map((c) =>
        c.id === comment.id
          ? {
              ...c,
              liked_by_me: nextLiked,
              likes_count: Math.max(0, (c.likes_count || 0) + (nextLiked ? 1 : -1)),
            }
          : c,
      );

    setComments((prev) => applyOptimistic(prev));
    setRepliesMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        next[key] = applyOptimistic(next[key]);
      });
      return next;
    });

    const { data, error } = await postEngagementService.toggleCommentLike(comment.id, {
      actorId: user.id,
      commentAuthorId: comment.author_id,
      postId: post.id,
    });

    if (error) {
      showToast(getSupabaseErrorMessage(error, 'No se pudo actualizar el Me gusta.'), 'error');
      void loadComments({ append: false });
      return;
    }

    if (data) {
      const sync = (list) =>
        list.map((c) =>
          c.id === comment.id
            ? { ...c, liked_by_me: data.liked, likes_count: data.likes_count }
            : c,
        );
      setComments((prev) => sync(prev));
      setRepliesMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          next[key] = sync(next[key]);
        });
        return next;
      });
    }
  };

  const handleLoadReplies = async (comment, { append = false } = {}) => {
    const commentId = comment.id;
    if (append) {
      setRepliesLoadingMore((prev) => ({ ...prev, [commentId]: true }));
    } else {
      setRepliesLoading((prev) => ({ ...prev, [commentId]: true }));
    }

    const offset = append ? (repliesMap[commentId]?.length ?? 0) : 0;
    const { data, error } = await postEngagementService.listReplies(commentId, {
      limit: REPLIES_PAGE_SIZE,
      offset,
    });

    if (append) {
      setRepliesLoadingMore((prev) => ({ ...prev, [commentId]: false }));
    } else {
      setRepliesLoading((prev) => ({ ...prev, [commentId]: false }));
    }

    if (error) {
      showToast(getSupabaseErrorMessage(error, 'No se pudieron cargar las respuestas.'), 'error');
      return;
    }

    const page = data ?? [];
    const nextLength = append
      ? (repliesMap[commentId]?.length ?? 0) + page.length
      : page.length;
    setRepliesMap((prev) => ({
      ...prev,
      [commentId]: append ? [...(prev[commentId] ?? []), ...page] : page,
    }));
    setRepliesHasMore((prev) => ({
      ...prev,
      [commentId]:
        page.length >= REPLIES_PAGE_SIZE &&
        nextLength < (comment.replies_count || Number.POSITIVE_INFINITY),
    }));
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Comentarios"
      className="!max-h-[85dvh]"
    >
      <div className="flex min-h-[40dvh] flex-col">
        <div className="min-h-0 flex-1 space-y-space-xs overflow-y-auto pb-space-md">
          {loading ? (
            <div className="flex justify-center py-space-xl">
              <Spinner />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-space-xl text-center text-body-small text-app-muted">
              Sé el primero en comentar.
            </p>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onLike={handleLike}
                onReply={setReplyTo}
                replies={repliesMap[comment.id] ?? []}
                repliesExpanded={Object.prototype.hasOwnProperty.call(repliesMap, comment.id)}
                repliesLoading={Boolean(repliesLoading[comment.id])}
                loadingMoreReplies={Boolean(repliesLoadingMore[comment.id])}
                hasMoreReplies={Boolean(repliesHasMore[comment.id])}
                onLoadReplies={handleLoadReplies}
              />
            ))
          )}
          {hasMore && !loading && comments.length > 0 ? (
            <div className="pt-space-sm">
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                loading={loadingMore}
                onClick={() => loadComments({ append: true })}
              >
                Cargar más comentarios
              </Button>
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 border-t border-app-divider bg-app-card pt-space-sm">
          {replyTo ? (
            <div className="mb-space-xs flex items-center justify-between gap-space-sm text-caption text-app-muted">
              <span className="truncate">
                Respondiendo a {replyTo.author_name || 'comentario'}
              </span>
              <button
                type="button"
                className="shrink-0 text-primary-600"
                onClick={() => setReplyTo(null)}
              >
                Cancelar
              </button>
            </div>
          ) : null}
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={replyTo ? 'Escribe una respuesta…' : 'Escribe un comentario…'}
            rows={2}
            maxLength={2000}
          />
          <div className="mt-space-sm flex justify-end">
            <Button
              size="sm"
              onClick={handleSubmit}
              loading={submitting}
              disabled={!body.trim()}
            >
              Publicar
            </Button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
