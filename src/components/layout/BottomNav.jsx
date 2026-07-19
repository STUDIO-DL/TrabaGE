import { NavLink } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ROLES, getRolePathPrefix, isEmployerRole, rolePath } from '../../constants/roles';
import { ICON_COLORS } from '../../constants/icons';
import { NavIcon } from './NavIcons';
import AppIcon from '../common/AppIcon';
import { Plus, ICON_SIZES } from '../../constants/icons';
import { notificationsService } from '../../services/notifications.service';
import { useKeyboard } from '../../hooks/useKeyboard';

function buildPersonalNav(role) {
  return [
    { to: rolePath(role, '/feed'), label: 'Inicio', icon: 'home' },
    { to: rolePath(role, '/jobs'), label: 'Empleos', icon: 'briefcase' },
    { to: rolePath(role, '/publish'), label: 'Publicar', icon: 'publish' },
    { to: rolePath(role, '/notifications'), label: 'Notificaciones', icon: 'bell', showBadge: true },
    { to: rolePath(role, '/profile'), label: 'Perfil', icon: 'user' },
  ];
}

function isEmployerPublishActive(pathname, role) {
  const prefix = getRolePathPrefix(role);
  if (!prefix) return false;

  return (
    pathname === `${prefix}/publish` ||
    pathname === `${prefix}/jobs/create` ||
    new RegExp(`^${prefix}/jobs/[^/]+/edit$`).test(pathname)
  );
}

function buildEmployerNav(role) {
  const employerRole = role ?? ROLES.BUSINESS;
  return [
    { to: rolePath(employerRole, '/feed'), label: 'Inicio', icon: 'home' },
    { to: rolePath(employerRole, '/dashboard'), label: 'Dashboard', icon: 'dashboard' },
    {
      to: rolePath(employerRole, '/publish'),
      label: 'Publicar',
      icon: 'publish',
      prominent: true,
    },
    {
      to: rolePath(employerRole, '/notifications'),
      label: 'Notificaciones',
      icon: 'bell',
      showBadge: true,
    },
    { to: rolePath(employerRole, '/profile'), label: 'Perfil', icon: 'user' },
  ];
}

export default function BottomNav() {
  const { role, user, isPreviewMode } = useAuth();
  const { bottomBarInset, isKeyboardVisible } = useKeyboard();
  const [unreadCount, setUnreadCount] = useState(0);

  const items = useMemo(
    () => (isEmployerRole(role) ? buildEmployerNav(role) : buildPersonalNav(ROLES.PERSONAL)),
    [role],
  );

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
    <nav
      aria-label="Navegación principal"
      className={[
        'fixed inset-x-0 z-nav flex justify-center keyboard-aware-footer',
        isKeyboardVisible ? '' : 'pb-safe',
      ].join(' ')}
      style={{ bottom: bottomBarInset }}
    >
      <div className="flex w-full max-w-lg items-end border-t border-app-border bg-app-card/95 backdrop-blur">
        {items.map(({ to, label, icon, showBadge, prominent }) => {
          if (prominent) {
            return (
              <NavLink
                key={to}
                to={to}
                end
                isActive={(_, location) => isEmployerPublishActive(location.pathname, role)}
                className="relative flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5 px-0.5 pb-1 pt-0.5"
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={[
                        'flex h-11 w-11 min-h-touch min-w-touch items-center justify-center rounded-radius-md shadow-elevation-2 transition-colors duration-fast ease-out',
                        isActive ? 'bg-primary-700' : 'bg-primary-600',
                      ].join(' ')}
                    >
                      <AppIcon icon={Plus} size={ICON_SIZES.md} className="text-white" />
                    </span>
                    <span
                      className={[
                        'truncate text-[11px] font-medium leading-tight sm:text-caption',
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
                  'relative flex min-h-touch min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-[11px] font-medium leading-tight transition-colors duration-fast ease-out sm:px-space-xs sm:text-caption',
                  isActive ? ICON_COLORS.primary : ICON_COLORS.inactive,
                ].join(' ')
              }
            >
              <span className="relative">
                <NavIcon name={icon} />
                {showBadge && unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-radius-circular bg-primary-600 ring-2 ring-app-card" />
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
