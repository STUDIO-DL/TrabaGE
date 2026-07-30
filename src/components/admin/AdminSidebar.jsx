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
            ? 'bg-primary-600 text-white shadow-sm'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <AppIcon
            icon={icon}
            size={ICON_SIZES.sm}
            className={isActive ? 'text-white' : 'text-slate-400'}
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
        'flex w-[240px] shrink-0 flex-col bg-slate-900 text-white',
        className,
      ].join(' ')}
    >
      <div className="border-b border-slate-800 px-space-md py-space-md">
        <TrabaGEWordmark size="md" className="[&>span:first-child]:text-white" />
        <p className="mt-space-xs text-caption text-slate-400">Administración</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-space-sm py-space-sm">
        {ADMIN_NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-slate-800 px-space-sm py-space-sm">
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          className="flex w-full items-center gap-space-sm rounded-radius-md px-space-sm py-2 text-body-small font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <AppIcon
            icon={ADMIN_LOGOUT_ITEM.icon}
            size={ICON_SIZES.sm}
            className="text-slate-400"
          />
          {ADMIN_LOGOUT_ITEM.label}
        </button>
        <div className="mt-space-sm flex justify-center px-space-sm pb-space-xs">
          <ZarrelCredit
            variant="powered"
            className="text-slate-500"
            linkClassName="text-slate-400 decoration-slate-600 hover:text-slate-300 hover:decoration-slate-500"
          />
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
