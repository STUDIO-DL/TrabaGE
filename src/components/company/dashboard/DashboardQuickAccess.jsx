import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROLES, rolePath } from '../../../constants/roles';

/** Quiet text links — one create path lives in the hero CTA. */
const LINKS = [
  { suffix: '/applicants', label: 'Candidatos' },
  { suffix: '/publish', label: 'Publicar' },
  { suffix: '/analytics', label: 'Analíticas' },
  { suffix: '/profile', label: 'Perfil' },
];

export default function DashboardQuickAccess() {
  const { role } = useAuth();
  const base = role || ROLES.BUSINESS;

  return (
    <nav
      aria-label="Accesos"
      className="flex flex-wrap items-center gap-x-space-base gap-y-space-sm border-b border-app-divider pb-space-md text-body-small"
    >
      {LINKS.map(({ suffix, label }) => (
        <Link
          key={suffix}
          to={rolePath(base, suffix)}
          className="font-medium text-primary-700/80 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
