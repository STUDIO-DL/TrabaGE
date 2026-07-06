import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../layout/PageContainer';
import NotificationItem from './NotificationItem';
import EmptyState from '../common/EmptyState';
import { NotificationListSkeleton } from '../common/Skeleton';
import Button from '../ui/Button';
import { Bell } from '../../constants/icons';
import { useNotifications } from '../../hooks/useNotifications';
import { usePushPermission } from '../../hooks/usePushPermission';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { analyticsService } from '../../services/analytics.service';
import {
  NOTIFICATION_FILTERS,
  NOTIFICATION_CATEGORY,
  matchesCategory,
  getNotificationCategory,
  getNotificationLink,
} from '../../utils/notificationCategories';

const EMPTY_COPY = {
  [NOTIFICATION_CATEGORY.ALL]: {
    title: 'No tienes notificaciones',
    description: 'Cuando recibas notificaciones importantes, las verás aquí.',
  },
  [NOTIFICATION_CATEGORY.JOBS]: {
    title: 'Sin notificaciones de empleos',
    description: 'Aquí verás nuevas ofertas, recomendaciones y novedades de tus candidaturas.',
  },
  [NOTIFICATION_CATEGORY.POSTS]: {
    title: 'Sin notificaciones de posts',
    description: 'Aquí verás publicaciones de las empresas e instituciones que sigues.',
  },
};

// Auto-fill filtered views: since filtering is client-side, a chip may show few
// rows even when more pages exist. Keep loading until we have enough to display.
const MIN_VISIBLE = 6;

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
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState(NOTIFICATION_CATEGORY.ALL);

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
    if (!loading && !loadingMore && hasMore && filtered.length < MIN_VISIBLE) {
      loadMore();
    }
  }, [loading, loadingMore, hasMore, filtered.length, loadMore]);

  const handleClick = async (notification) => {
    await markAsRead(notification.id);

    if (
      role === 'candidate' &&
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
    const { error } = await deleteNotification(notification.id);
    showToast(
      error ? getSupabaseErrorMessage(error) : 'Notificación eliminada',
      error ? 'error' : 'success',
    );
  };

  const emptyCopy = EMPTY_COPY[activeFilter] ?? EMPTY_COPY[NOTIFICATION_CATEGORY.ALL];

  return (
    <PageContainer
      title="Notificaciones"
      actions={
        hasUnread && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            Marcar todo
          </Button>
        )
      }
    >
      {/* Segmented filter chips — horizontally scrollable, no scrollbar clutter */}
      <div className="sticky top-14 z-10 border-b border-app-border bg-app-bg/95 backdrop-blur supports-[backdrop-filter]:bg-app-bg/80">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NOTIFICATION_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                aria-pressed={isActive}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3">
        {loading ? (
          <NotificationListSkeleton count={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            variant="soft"
            icon={Bell}
            title={emptyCopy.title}
            description={emptyCopy.description}
          />
        ) : (
          <div className="divide-y divide-gray-100">
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
          <div className="pt-2">
            <NotificationListSkeleton count={2} />
          </div>
        )}

        {!loading && hasMore && !loadingMore && filtered.length > 0 && (
          <button
            type="button"
            onClick={loadMore}
            aria-label="Cargar más notificaciones"
            className="mt-3 w-full rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Cargar más
          </button>
        )}
      </div>
    </PageContainer>
  );
}
