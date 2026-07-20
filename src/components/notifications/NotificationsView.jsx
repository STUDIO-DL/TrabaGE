import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../layout/PageContainer';
import TopBar from '../layout/TopBar';
import NotificationItem from './NotificationItem';
import EmptyState from '../common/EmptyState';
import FetchErrorBanner from '../common/FetchErrorBanner';
import { NotificationListSkeleton } from '../common/Skeleton';
import Button from '../ui/Button';
import { Bell } from '../../constants/icons';
import { useNotifications } from '../../hooks/useNotifications';
import { usePushPermission } from '../../hooks/usePushPermission';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { ROLES, isEmployerRole, isPersonalRole } from '../../constants/roles';
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
    title: 'No tienes notificaciones',
    description: 'Cuando recibas notificaciones importantes, las verás aquí.',
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
    title: 'Estás al día',
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

export default function NotificationsView({ role = 'candidate' }) {
  usePushPermission();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotificationContext();
  const {
    notifications,
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

  const hasUnread = useMemo(() => notifications.some((n) => !n.read), [notifications]);

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
    // #region agent log
    fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'49d13a'},body:JSON.stringify({sessionId:'49d13a',runId:'pre-fix',hypothesisId:'A',location:'NotificationsView.jsx:handleClick',message:'in-app notification row clicked',data:{notificationId:notification?.id,type:notification?.type,role,link,metadata:notification?.metadata??null,willNavigate:Boolean(link)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (link) navigate(link);
  };

  const handleDelete = async (notification) => {
    const { error } = await deleteNotification(notification.id);
    showToast(
      error ? getSupabaseErrorMessage(error) : 'Notificación eliminada.',
      error ? 'error' : 'success',
    );
  };

  const emptyCopyByRole = isEmployerRole(role) ? EMPLOYER_EMPTY_COPY : CANDIDATE_EMPTY_COPY;
  const emptyCopy = emptyCopyByRole[activeFilter] ?? emptyCopyByRole[NOTIFICATION_CATEGORY.ALL];

  return (
    <PageContainer
      topBar={
        <TopBar
          actions={
            hasUnread ? (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Marcar todo leído
              </Button>
            ) : null
          }
        />
      }
    >
      {/* Segmented filter chips — horizontally scrollable, no scrollbar clutter */}
      <div className="sticky-below-topbar border-b border-app-border bg-app-bg/95 backdrop-blur supports-[backdrop-filter]:bg-app-bg/80">
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
                    ? 'bg-primary-600 text-white shadow-elevation-1'
                    : 'bg-app-disabled text-app-muted hover:bg-app-surface',
                ].join(' ')}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-space-md">
        {error ? (
          <FetchErrorBanner
            message="No se pudieron cargar las notificaciones. Inténtalo de nuevo."
            onRetry={refetch}
            className="mb-space-md"
          />
        ) : null}

        {loading ? (
          <NotificationListSkeleton count={6} />
        ) : filtered.length === 0 && !error ? (
          <EmptyState
            variant="soft"
            icon={Bell}
            title={emptyCopy.title}
            description={emptyCopy.description}
          />
        ) : (
          <div className="divide-y divide-app-divider">
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

        {loadingMore && (
          <div className="pt-space-sm">
            <NotificationListSkeleton count={2} />
          </div>
        )}

        {!loading && hasMore && !loadingMore && filtered.length > 0 && (
          <Button
            variant="secondary"
            fullWidth
            className="mt-space-md"
            onClick={loadMore}
            aria-label="Cargar más notificaciones"
          >
            Cargar más
          </Button>
        )}
      </div>
    </PageContainer>
  );
}
