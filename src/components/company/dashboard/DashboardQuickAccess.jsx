import { Link } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import {
  Building2,
  Plus,
  Users,
  ICON_COLORS,
  ICON_SIZES,
} from '../../../constants/icons';
import { useAuth } from '../../../hooks/useAuth';
import { ROLES, rolePath } from '../../../constants/roles';

const ICON_SURFACE = 'bg-app-surface text-app-text ring-1 ring-app-border dark:bg-app-elevated';

export default function DashboardQuickAccess() {
  const { role } = useAuth();
  const base = role || ROLES.BUSINESS;
  const quickLinks = [
    { to: rolePath(base, '/jobs/create'), label: 'Crear oferta', icon: Plus, accent: true },
    { to: rolePath(base, '/applicants'), label: 'Ver postulaciones', icon: Users },
    { to: rolePath(base, '/profile'), label: 'Editar perfil', icon: Building2 },
  ];

  return (
    <section className="surface-card p-5">
      <h2 className="text-base font-semibold text-app-text">Acciones rápidas</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {quickLinks.map(({ to, label, icon: Icon, accent }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-xl border border-app-border bg-app-surface px-3 py-3 transition hover:border-app-muted/50 hover:bg-app-card"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${ICON_SURFACE}`}>
              <AppIcon
                icon={Icon}
                size={ICON_SIZES.default}
                className={accent ? ICON_COLORS.positive : ICON_COLORS.default}
              />
            </span>
            <span className="text-sm font-medium text-app-text">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
