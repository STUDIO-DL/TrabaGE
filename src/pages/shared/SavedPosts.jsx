import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import EmptyState from '../../components/common/EmptyState';
import FetchErrorBanner from '../../components/common/FetchErrorBanner';
import { PostListSkeleton } from '../../components/common/Skeleton';
import Button from '../../components/ui/Button';
import PostCard from '../../components/feed/PostCard';
import AppIcon from '../../components/common/AppIcon';
import { ArrowLeft, ICON_SIZES } from '../../constants/icons';
import { postEngagementService } from '../../features/post-engagement/data/postEngagement.service';
import { PostEngagementProvider } from '../../features/post-engagement/ui/PostEngagementContext';
import { useAuth } from '../../hooks/useAuth';
import { usePostMutations } from '../../hooks/usePostMutations';
import { useNotificationContext } from '../../context/NotificationContext';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { topBarInnerClass, topBarOuterClass } from '../../components/layout/TopBar';
import { navigateBack, resolveBackFallback } from '../../utils/safeNavigation';

const PAGE_SIZE = 20;

/**
 * Owner-only collection of saved posts.
 * Routes: /personal/profile/saved | /:role/profile/saved
 */
export default function SavedPosts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useNotificationContext();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const title = location.state?.title || 'Guardados';

  const load = useCallback(
    async ({ append = false } = {}) => {
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(null);
      }

      const offset = append ? posts.length : 0;
      const { data, error: fetchError } = await postEngagementService.listSavedPosts({
        limit: PAGE_SIZE,
        offset,
      });

      if (fetchError) {
        const message = getSupabaseErrorMessage(fetchError, 'No se pudieron cargar los guardados.');
        if (!append) setError(message);
        else showToast(message, 'error');
      } else {
        const page = data ?? [];
        setPosts((prev) => (append ? [...prev, ...page] : page));
        setHasMore(page.length >= PAGE_SIZE);
      }

      setLoading(false);
      setLoadingMore(false);
    },
    [posts.length, showToast],
  );

  useEffect(() => {
    void load({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { handleEdit, handleDelete, deleteConfirmModal } = usePostMutations({
    onSuccess: (deletedPost) => {
      if (deletedPost?.id) {
        setPosts((prev) => prev.filter((p) => p.id !== deletedPost.id));
        return;
      }
      void load({ append: false });
    },
  });

  const postIds = useMemo(() => posts.map((p) => p.id).filter(Boolean), [posts]);

  const handleBack = () => {
    navigateBack(navigate, { fallback: resolveBackFallback(location) });
  };

  const handleHidden = (post) => {
    if (post?.id) setPosts((prev) => prev.filter((p) => p.id !== post.id));
  };

  return (
    <PageContainer bottomNav={false} className="bg-app-surface">
      <header className={topBarOuterClass}>
        <div className={topBarInnerClass}>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-radius-sm p-space-sm text-app-muted transition-colors duration-fast hover:bg-app-surface"
            aria-label="Volver al perfil"
          >
            <AppIcon icon={ArrowLeft} size={ICON_SIZES.md} />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-subtitle font-semibold text-app-text">
            {title}
          </h1>
        </div>
      </header>

      <PostEngagementProvider postIds={postIds}>
        <div className="space-y-space-lg px-space-base pt-space-base pb-space-xl">
          {loading ? (
            <PostListSkeleton count={3} />
          ) : error ? (
            <FetchErrorBanner message={error} onRetry={() => load({ append: false })} />
          ) : posts.length === 0 ? (
            <EmptyState
              variant="text"
              title="Aún no hay publicaciones guardadas"
              description="Usa el marcador en cualquier publicación para guardarla aquí."
            />
          ) : (
            posts.map((post, index) => (
              <div
                key={post.id}
                className="card-enter"
                style={{ animationDelay: `${Math.min(index, 6) * 30}ms` }}
              >
                <PostCard
                  post={post}
                  authorId={post.author_id}
                  authorName={post.author_name?.trim() || ''}
                  authorHeadline={post.author_headline ?? ''}
                  authorAvatar={post.author_avatar}
                  authorType={post.author_type ?? 'personal'}
                  authorCompany={post.author_company}
                  canManage={post.author_id === user?.id}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onHidden={handleHidden}
                />
              </div>
            ))
          )}

          {loadingMore ? <PostListSkeleton count={1} /> : null}
          {!loading && !error && hasMore && posts.length > 0 && !loadingMore ? (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => load({ append: true })}
              aria-label="Cargar más guardados"
            >
              Cargar más
            </Button>
          ) : null}
          {deleteConfirmModal}
        </div>
      </PostEngagementProvider>
    </PageContainer>
  );
}
