import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import ZarrelCredit from '../branding/ZarrelCredit';
import TrabaGEWordmark from '../branding/TrabaGEWordmark';
import LogoutConfirmModal from '../profile/modals/LogoutConfirmModal';
import { ICON_SIZES } from '../../constants/icons';
import { useAuth } from '../../hooks/useAuth';
import { ADMIN_LOGOUT_ITEM, ADMIN_NAV_ITEMS } from './adminNav';

function NavItem({ to, label, icon, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'flex items-center gap-space-sm rounded-radius-md px-space-sm py-2 text-body-small font-medium transition-colors duration-fast',
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-app-muted hover:bg-primary-50/50 hover:text-app-text',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <AppIcon
            icon={icon}
            size={ICON_SIZES.sm}
            className={isActive ? 'text-primary-600' : 'text-app-subtle'}
          />
          {label}
        </>
      )}
    </NavLink>
  );
}

export default function AdminSidebar({ onNavigate, className = '' }) {
  const { logout } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const confirmLogout = async () => {
    setLogoutLoading(true);
    onNavigate?.();
    await logout();
    setLogoutLoading(false);
    setLogoutOpen(false);
  };

  return (
    <aside
      className={[
        'flex w-[240px] shrink-0 flex-col border-r border-app-border bg-app-card text-app-text',
        className,
      ].join(' ')}
    >
      <div className="border-b border-app-divider px-space-md py-space-md">
        <TrabaGEWordmark size="md" />
        <p className="mt-space-xs text-caption text-app-subtle">Administración</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-space-sm py-space-sm">
        {ADMIN_NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-app-divider px-space-sm py-space-sm">
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          className="flex w-full items-center gap-space-sm rounded-radius-md px-space-sm py-2 text-body-small font-medium text-app-muted transition-colors hover:bg-app-surface hover:text-app-text"
        >
          <AppIcon
            icon={ADMIN_LOGOUT_ITEM.icon}
            size={ICON_SIZES.sm}
            className="text-app-subtle"
          />
          {ADMIN_LOGOUT_ITEM.label}
        </button>
        <div className="mt-space-sm flex justify-center px-space-sm pb-space-xs">
          <ZarrelCredit variant="powered" />
        </div>
      </div>

      <LogoutConfirmModal
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={confirmLogout}
        loading={logoutLoading}
      />
    </aside>
  );
}
