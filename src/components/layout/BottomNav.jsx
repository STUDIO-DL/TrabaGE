import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { ROLES } from '../../constants/roles';

const candidateNav = [
  { to: '/candidate/feed', label: 'Inicio' },
  { to: '/candidate/jobs', label: 'Empleos' },
  { to: '/candidate/notifications', label: 'Notif.', showBadge: true },
  { to: '/candidate/profile', label: 'Perfil' },
];

const companyNav = [
  { to: '/company/feed', label: 'Inicio' },
  { to: '/company/dashboard', label: 'Dashboard' },
  { to: '/company/publish-job', label: 'Publicar' },
  { to: '/company/profile', label: 'Perfil' },
];

export default function BottomNav() {
  const { role } = useAuth();
  const { unreadCount } = useNotifications();

  const items = role === ROLES.COMPANY ? companyNav : candidateNav;

  if (role === ROLES.ADMIN) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white pb-safe">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map(({ to, label, showBadge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors',
                isActive ? 'text-primary-600' : 'text-gray-400',
              ].join(' ')
            }
          >
            {label}
            {showBadge && unreadCount > 0 && (
              <span className="absolute right-6 top-1 h-2 w-2 rounded-full bg-red-500" />
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
