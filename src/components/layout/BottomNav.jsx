import { useEffect, useMemo, useState, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useUnreadNotificationsCount } from '../../hooks/useUnreadNotificationsCount';
import { ROLES, isEmployerRole, rolePath } from '../../constants/roles';
import {
  buildAppNav,
  isEmployerPublishActive,
} from '../../constants/appNav';
import { getOwnCompanyProfileKey } from '../../constants/profileQueryKeys';
import { companyService } from '../../services/company.service';
import { ICON_COLORS } from '../../constants/icons';
import { NavIcon } from './NavIcons';
import AppIcon from '../common/AppIcon';
import { Plus, ICON_SIZES } from '../../constants/icons';
import { useKeyboard } from '../../hooks/useKeyboard';
import { exitGuestToAuth } from '../../utils/guestMode';

/** Mobile + tablet primary nav. Hidden on lg+ (AppSidebar takes over). */
export default function BottomNav() {
  const { role, user, isPreviewMode } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { bottomBarInset, isKeyboardVisible } = useKeyboard();
  const { count: unreadCount } = useUnreadNotificationsCount();
  const [mounted, setMounted] = useState(false);
  const guestEmployerNav = isPreviewMode && isEmployerRole(role);
  const dashboardPath = rolePath(role || ROLES.BUSINESS, '/dashboard');

  const handleGuestNav = useCallback(
    (event, to) => {
      if (!guestEmployerNav) return;
      // Keep the dashboard demo open; every other destination asks for an account.
      if (to === dashboardPath) return;
      event.preventDefault();
      exitGuestToAuth(navigate);
    },
    [dashboardPath, guestEmployerNav, navigate],
  );

  const prefetchCompanyProfile = useCallback(() => {
    if (!user?.id || isPreviewMode || !isEmployerRole(role)) return;
    const queryKey = getOwnCompanyProfileKey(user.id);
    if (!queryKey) return;
    void queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        const { data, error } = await companyService.getCompanyProfile(user.id);
        if (error) throw error;
        return data;
      },
      staleTime: 60_000,
    });
  }, [isPreviewMode, queryClient, role, user?.id]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    prefetchCompanyProfile();
  }, [prefetchCompanyProfile]);

  const items = useMemo(() => buildAppNav(role), [role]);

  if (role === ROLES.ADMIN || !mounted) return null;

  const nav = (
    <nav
      aria-label="Navegación principal"
      data-bottom-nav=""
      className={[
        'fixed inset-x-0 bottom-0 z-nav border-t border-app-border bg-white keyboard-aware-footer lg:hidden dark:bg-app-card',
        isKeyboardVisible ? '' : 'pb-safe',
      ].join(' ')}
      style={{ bottom: bottomBarInset }}
    >
      <div className="mx-auto flex w-full max-w-lg items-end md:max-w-2xl">
        {items.map(({ to, label, icon, showBadge, prominent }) => {
          if (prominent) {
            return (
              <NavLink
                key={to}
                to={to}
                end
                onClick={(event) => handleGuestNav(event, to)}
                onMouseEnter={prefetchCompanyProfile}
                onFocus={prefetchCompanyProfile}
                onTouchStart={prefetchCompanyProfile}
                isActive={(_, location) => isEmployerPublishActive(location.pathname, role)}
                className="relative flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5 px-0.5 pb-1 pt-0.5"
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={[
                        'flex h-11 w-11 min-h-touch min-w-touch items-center justify-center rounded-radius-md transition-colors duration-fast ease-out',
                        isActive ? 'bg-primary-700' : 'bg-primary-600',
                      ].join(' ')}
                    >
                      <AppIcon icon={Plus} size={ICON_SIZES.md} className="text-white" />
                    </span>
                    <span
                      className={[
                        'truncate text-caption font-medium leading-tight',
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
              onClick={(event) => handleGuestNav(event, to)}
              className={({ isActive }) =>
                [
                  'relative flex min-h-touch min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-caption font-medium leading-tight transition-colors duration-fast ease-out sm:px-space-xs',
                  isActive ? ICON_COLORS.primary : ICON_COLORS.inactive,
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative inline-flex items-center justify-center px-2 py-1">
                    <NavIcon name={icon} />
                    {showBadge && !guestEmployerNav && unreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-radius-circular bg-primary-600 ring-2 ring-white dark:ring-app-card" />
                    )}
                  </span>
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );

  return createPortal(nav, document.body);
}
