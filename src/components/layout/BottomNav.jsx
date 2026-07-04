import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';
import { ICON_COLORS } from '../../constants/icons';
import { NavIcon } from './NavIcons';
import AppIcon from '../common/AppIcon';
import { Plus, ICON_SIZES } from '../../constants/icons';
import { notificationsService } from '../../services/notifications.service';

const candidateNav = [
  { to: '/candidate/feed', label: 'Inicio', icon: 'home' },
  { to: '/candidate/jobs', label: 'Empleos', icon: 'briefcase' },
  { to: '/candidate/publish', label: 'Publicar', icon: 'publish' },
  { to: '/candidate/notifications', label: 'Notificaciones', icon: 'bell', showBadge: true },
  { to: '/candidate/profile', label: 'Perfil', icon: 'user' },
];

const companyNav = [
  { to: '/company/feed', label: 'Inicio', icon: 'home' },
  { to: '/company/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/company/jobs/create', label: 'Publicar', icon: 'publish', prominent: true },
  { to: '/company/notifications', label: 'Notificaciones', icon: 'bell', showBadge: true },
  { to: '/company/profile', label: 'Perfil', icon: 'user' },
];

export default function BottomNav() {
  const { role, user, isPreviewMode } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const items = role === ROLES.COMPANY ? companyNav : candidateNav;

  useEffect(() => {
    let cancelled = false;

    async function loadUnreadCount() {
      if (!user?.id || isPreviewMode || role === ROLES.ADMIN) {
        setUnreadCount(0);
        return;
      }

      const { count } = await notificationsService.getUnreadCount(user.id);
      if (!cancelled) setUnreadCount(count ?? 0);
    }

    loadUnreadCount();

    return () => {
      cancelled = true;
    };
  }, [isPreviewMode, role, user?.id]);

  if (role === ROLES.ADMIN) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-app-border bg-app-card/95 pb-safe backdrop-blur">
      <div className="mx-auto flex max-w-lg items-end">
        {items.map(({ to, label, icon, showBadge, prominent }) => {
          if (prominent) {
            return (
              <NavLink
                key={to}
                to={to}
                className="relative flex min-w-0 flex-1 flex-col items-center justify-end gap-1 px-0.5 pb-2 pt-1"
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={[
                        'flex h-12 w-12 items-center justify-center rounded-2xl shadow-md transition-colors',
                        isActive ? 'bg-primary-700' : 'bg-primary-600',
                      ].join(' ')}
                    >
                      <AppIcon icon={Plus} size={ICON_SIZES.nav} className="text-white" />
                    </span>
                    <span
                      className={[
                        'truncate text-[9px] font-medium leading-tight sm:text-[10px]',
                        isActive ? ICON_COLORS.primary : ICON_COLORS.inactive,
                      ].join(' ')}
                    >
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-[9px] font-medium leading-tight transition-colors sm:px-1 sm:text-[10px]',
                  isActive ? ICON_COLORS.primary : ICON_COLORS.inactive,
                ].join(' ')
              }
            >
              <span className="relative">
                <NavIcon name={icon} className="h-6 w-6" />
                {showBadge && unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary-600 ring-2 ring-app-card" />
                )}
              </span>
              <span className="truncate">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
