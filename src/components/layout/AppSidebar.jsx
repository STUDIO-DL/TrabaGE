import TrabaGEWordmark from '../branding/TrabaGEWordmark';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLES, rolePath, isEmployerRole } from '../../constants/roles';
import { buildAppNav, isEmployerPublishActive } from '../../constants/appNav';
import { useUnreadNotificationsCount } from '../../hooks/useUnreadNotificationsCount';
import { ICON_SIZES } from '../../constants/icons';
import { NavIcon } from './NavIcons';
import AppIcon from '../common/AppIcon';
import { Building2, Plus } from '../../constants/icons';

/**
 * Desktop (lg+) primary navigation — LinkedIn-style left rail.
 * Hidden on mobile/tablet; BottomNav covers those breakpoints.
 */
export default function AppSidebar({ className = '' }) {
  const { role } = useAuth();
  const { count: unreadCount } = useUnreadNotificationsCount();
  const items = buildAppNav(role);
  const homeTo = isEmployerRole(role)
    ? rolePath(role || ROLES.BUSINESS, '/feed')
    : rolePath(ROLES.PERSONAL, '/feed');

  return (
    <aside
      className={[
        'sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col border-r border-app-border bg-app-card lg:flex',
        className,
      ].join(' ')}
      aria-label="Navegación principal"
    >
      <div className="border-b border-app-divider px-space-md py-space-md">
        <Link to={homeTo} className="inline-flex">
          <TrabaGEWordmark size="md" />
        </Link>
        <p className="mt-space-xs text-caption text-app-subtle">
          {isEmployerRole(role) ? 'Empresa' : 'Profesional'}
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-space-sm py-space-sm">
        {items.map(({ to, label, icon, showBadge, prominent }) => {
          if (prominent) {
            return (
              <NavLink
                key={to}
                to={to}
                end
                isActive={(_, location) => isEmployerPublishActive(location.pathname, role)}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-space-sm rounded-radius-md px-space-sm py-2 text-body-small font-semibold transition-colors duration-fast',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'bg-app-surface text-primary-600 ring-1 ring-inset ring-app-border hover:bg-app-disabled',
                  ].join(' ')
                }
              >
                <AppIcon icon={Plus} size={ICON_SIZES.sm} className="shrink-0" />
                {label}
              </NavLink>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-space-sm rounded-radius-md px-space-sm py-2 text-body-small font-medium transition-colors duration-fast',
                  isActive
                    ? 'bg-app-surface font-semibold text-primary-600'
                    : 'text-app-muted hover:bg-app-surface hover:text-app-text',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative shrink-0">
                    <NavIcon
                      name={icon}
                      className={isActive ? 'text-primary-600' : 'text-app-subtle'}
                    />
                    {showBadge && unreadCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-radius-circular bg-primary-600 ring-2 ring-app-card" />
                    ) : null}
                  </span>
                  <span className="min-w-0 truncate">{label}</span>
                  {showBadge && unreadCount > 0 ? (
                    <span className="ml-auto tabular-nums text-caption font-semibold text-primary-600">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      {role === ROLES.PERSONAL ? (
        <div className="border-t border-app-divider p-space-sm">
          <Link
            to="/personal/business/create"
            className="flex items-center gap-space-sm rounded-radius-md px-space-sm py-2 text-body-small font-semibold text-app-muted transition-colors hover:bg-app-surface hover:text-primary-600"
          >
            <Building2 className="h-4 w-4 shrink-0" aria-hidden />
            <span>Para empresas</span>
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
