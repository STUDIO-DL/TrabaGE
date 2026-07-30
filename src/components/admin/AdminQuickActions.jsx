import { Link } from 'react-router-dom';

const QUICK_ACTIONS = [
  { to: '/admin/analytics', label: 'Analítica' },
  { to: '/admin/users', label: 'Usuarios' },
  { to: '/admin/companies', label: 'Empresas' },
  { to: '/admin/organizations', label: 'Organizaciones' },
  { to: '/admin/verifications', label: 'Verificaciones' },
  { to: '/admin/jobs', label: 'Ofertas' },
  { to: '/admin/posts', label: 'Publicaciones' },
  { to: '/admin/reports', label: 'Reportes' },
];

/** Quiet nav links — same pattern as company dashboard. */
export default function AdminQuickActions() {
  return (
    <nav
      aria-label="Accesos rápidos"
      className="flex flex-wrap items-center gap-x-space-base gap-y-space-sm text-body-small"
    >
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.to}
          to={action.to}
          className="font-medium text-app-muted transition-colors hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          {action.label}
        </Link>
      ))}
    </nav>
  );
}
