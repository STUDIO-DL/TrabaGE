import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../layout/PageContainer';
import { topBarInnerClass, topBarOuterClass } from '../layout/TopBar';
import NotificationItem from './NotificationItem';
import EmptyState from '../common/EmptyState';
import FetchErrorBanner from '../common/FetchErrorBanner';
import { NotificationListSkeleton } from '../common/Skeleton';
import Button from '../ui/Button';
import { NoNotifications } from '../../assets/empty-states';
import { useNotifications } from '../../hooks/useNotifications';
import { usePushPermission } from '../../hooks/usePushPermission';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { isEmployerRole, isPersonalRole } from '../../constants/roles';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { analyticsService } from '../../services/analytics.service';
import {
  NOTIFICATION_FILTERS,
  NOTIFICATION_CATEGORY,
  matchesCategory,
  getNotificationCategory,
  getNotificationLink,
} from '../../utils/notificationCategories';

const CANDIDATE_EMPTY_COPY = {
  [NOTIFICATION_CATEGORY.ALL]: {
    title: 'Aún no tienes notificaciones.',
    description: 'Cuando recibas avisos importantes, aparecerán aquí.',
  },
  [NOTIFICATION_CATEGORY.JOBS]: {
    title: 'Sin notificaciones de empleos',
    description: 'Aquí verás nuevas ofertas, recomendaciones y novedades de tus candidaturas.',
  },
  [NOTIFICATION_CATEGORY.POSTS]: {
    title: 'Sin novedades de publicaciones',
    description: 'Aquí verás actualizaciones de las cuentas Business y organizaciones que sigues.',
  },
};

const EMPLOYER_EMPTY_COPY = {
  [NOTIFICATION_CATEGORY.ALL]: {
    title: 'Aún no tienes notificaciones.',
    description: 'Te avisaremos de postulaciones, interacciones y novedades de tus publicaciones.',
  },
  [NOTIFICATION_CATEGORY.JOBS]: {
    title: 'Sin novedades',
    description: 'Aquí verás nuevas postulaciones y cambios en el estado de tus ofertas.',
  },
  [NOTIFICATION_CATEGORY.POSTS]: {
    title: 'Sin actualizaciones',
    description: 'Las interacciones y novedades de tus publicaciones aparecerán aquí.',
  },
};

// Auto-fill filtered views: since filtering is client-side, a chip may show few
// rows even when more pages exist. Keep loading until we have enough to display.
const MIN_VISIBLE = 6;
const MAX_AUTO_FETCH_PAGES = 5;

function NotificationsHeader({ unreadCount, onMarkAllAsRead }) {
  const hasUnread = unreadCount > 0;

  return (
    <header className={`${topBarOuterClass} bg-app-card/95`}>
      <div className={`${topBarInnerClass} h-auto min-h-topbar items-center py-space-sm`}>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-subtitle font-semibold tracking-tight text-app-text">
            Notificaciones
          </h1>
          {hasUnread ? (
            <p className="mt-0.5 text-caption font-medium text-primary-600">
              {unreadCount} sin leer
            </p>
          ) : null}
        </div>
        {hasUnread ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="shrink-0 text-primary-600 hover:bg-primary-50 hover:text-primary-700"
          >
            Marcar todas como leídas
          </Button>
        ) : null}
      </div>
    </header>
  );
}

export default function NotificationsView({ role = 'candidate' }) {
  usePushPermission();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotificationContext();
  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    refetch,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState(NOTIFICATION_CATEGORY.ALL);
  const autoFetchCountRef = useRef(0);

  const filtered = useMemo(
    () => notifications.filter((n) => matchesCategory(n, activeFilter)),
    [notifications, activeFilter],
  );

  // Infinite scroll (mirrors the Feed pattern).
  useEffect(() => {
    const handleScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 600;
      if (nearBottom) loadMore();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  // Keep filtered chips populated by pulling more pages when needed.
  useEffect(() => {
    if (activeFilter === NOTIFICATION_CATEGORY.ALL) {
      autoFetchCountRef.current = 0;
      return;
    }
    if (!loading && !loadingMore && hasMore && filtered.length < MIN_VISIBLE) {
      if (autoFetchCountRef.current >= MAX_AUTO_FETCH_PAGES) return;
      autoFetchCountRef.current += 1;
      loadMore();
    }
  }, [activeFilter, loading, loadingMore, hasMore, filtered.length, loadMore]);

  const handleClick = async (notification) => {
    await markAsRead(notification.id);

    if (
      isPersonalRole(role) &&
      getNotificationCategory(notification) === NOTIFICATION_CATEGORY.JOBS &&
      notification.metadata?.job_id &&
      user?.id
    ) {
      analyticsService.trackNotificationOpened(user.id, notification.metadata.job_id, {
        notification_id: notification.id,
        score: notification.metadata?.score,
      });
    }

    const link = getNotificationLink(notification, role);
    if (link) navigate(link);
  };

  const handleDelete = async (notification) => {
    const { error: deleteError } = await deleteNotification(notification.id);
    showToast(
      deleteError ? getSupabaseErrorMessage(deleteError) : 'Notificación eliminada.',
      deleteError ? 'error' : 'success',
    );
  };

  const emptyCopyByRole = isEmployerRole(role) ? EMPLOYER_EMPTY_COPY : CANDIDATE_EMPTY_COPY;
  const emptyCopy = emptyCopyByRole[activeFilter] ?? emptyCopyByRole[NOTIFICATION_CATEGORY.ALL];
  const showIllustration = activeFilter === NOTIFICATION_CATEGORY.ALL;

  return (
    <PageContainer
      className="bg-app-card"
      contentClassName="bg-app-card"
      topBar={
        <NotificationsHeader unreadCount={unreadCount} onMarkAllAsRead={markAllAsRead} />
      }
    >
      <div className="min-h-full bg-app-card">
        {/* Segmented filter chips — horizontally scrollable, no scrollbar clutter */}
        <div className="notifications-filters-sticky border-b border-app-divider bg-app-card/95 backdrop-blur supports-[backdrop-filter]:bg-app-card/90">
          <div className="flex gap-space-sm overflow-x-auto px-space-base py-space-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NOTIFICATION_FILTERS.map((filter) => {
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  aria-pressed={isActive}
                  className={[
                    'shrink-0 rounded-radius-circular px-space-base py-space-sm text-body-small font-medium transition-colors duration-fast',
                    'min-h-touch',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'bg-transparent text-app-muted ring-1 ring-app-border hover:bg-primary-50/50 hover:text-primary-700',
                  ].join(' ')}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-auto w-full max-w-lg md:max-w-2xl lg:max-w-3xl">
          {error ? (
            <FetchErrorBanner
              message="No se pudieron cargar las notificaciones. Inténtalo de nuevo."
              onRetry={refetch}
              className="mx-space-base mt-space-md"
            />
          ) : null}

          {loading ? (
            <div className="px-space-base">
              <NotificationListSkeleton count={6} />
            </div>
          ) : filtered.length === 0 && !error ? (
            <EmptyState
              image={showIllustration ? NoNotifications : undefined}
              variant={showIllustration ? 'default' : 'text'}
              title={emptyCopy.title}
              description={emptyCopy.description}
            />
          ) : (
            <div className="motion-list">
              {filtered.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onClick={handleClick}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {loadingMore ? (
            <div className="px-space-base pt-space-sm">
              <NotificationListSkeleton count={2} />
            </div>
          ) : null}

          {!loading && hasMore && !loadingMore && filtered.length > 0 ? (
            <div className="px-space-base py-space-md">
              <Button
                variant="secondary"
                fullWidth
                onClick={loadMore}
                aria-label="Cargar más notificaciones"
              >
                Cargar más
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
