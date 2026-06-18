import { NavLink } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
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
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
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
            size={ICON_SIZES.default}
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

  return (
    <aside
      className={[
        'flex w-[260px] shrink-0 flex-col bg-slate-900 text-white',
        className,
      ].join(' ')}
    >
      <div className="border-b border-slate-800 px-5 py-6">
        <div>
          <p className="text-lg font-bold tracking-tight">TrabaGE</p>
          <p className="text-xs text-slate-400">Panel de administración</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {ADMIN_NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            logout();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <AppIcon icon={ADMIN_LOGOUT_ITEM.icon} size={ICON_SIZES.default} className="text-slate-400" />
          {ADMIN_LOGOUT_ITEM.label}
        </button>
      </div>
    </aside>
  );
}
