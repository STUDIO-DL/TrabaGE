import { useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import AppIcon from '../../components/common/AppIcon';
import { ArrowLeft, ICON_SIZES } from '../../constants/icons';
import HomeFeedLayout from '../../components/home/HomeFeedLayout';
import { useAuth } from '../../hooks/useAuth';
import { topBarInnerClass, topBarOuterClass } from '../../components/layout/TopBar';

/**
 * Filtered author feed — reuses HomeFeedLayout / ParaTiPanel / PostCard.
 * Routes: /personal/profile/posts | /profile/:userId/posts |
 *         /:role/profile/posts | /companies/:companyId/posts
 */
export default function AuthorFeed() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, companyId } = useParams();
  const { user } = useAuth();

  const authorId = useMemo(() => {
    if (location.state?.authorId) return String(location.state.authorId);
    if (userId) return userId;
    if (companyId) return companyId;
    return user?.id || null;
  }, [companyId, location.state?.authorId, user?.id, userId]);

  const title = location.state?.title || 'Publicaciones';
  const emptyDescription =
    location.state?.emptyDescription || 'Aún no hay publicaciones.';

  const handleBack = () => {
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
      return;
    }
    const fallback = location.state?.from || location.state?.backTo;
    if (fallback) {
      navigate(fallback, { replace: true });
      return;
    }
    navigate(-1);
  };

  const header = (
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
  );

  return (
    <HomeFeedLayout
      header={header}
      authorId={authorId}
      emptyDescription={emptyDescription}
      bottomNav={false}
    />
  );
}
