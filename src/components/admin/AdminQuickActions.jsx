import { Link } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  Flag,
  Landmark,
  Newspaper,
  ShieldCheck,
  Users,
  ICON_COLORS,
  ICON_SIZES,
} from '../../constants/icons';
import AppIcon from '../common/AppIcon';

const ICON_SURFACE = 'bg-app-surface text-app-text ring-1 ring-app-border dark:bg-app-elevated';

const QUICK_ACTIONS = [
  { to: '/admin/users', label: 'Usuarios', icon: Users },
  { to: '/admin/companies', label: 'Empresas', icon: Building2 },
  { to: '/admin/organizations', label: 'Organizaciones', icon: Landmark },
  { to: '/admin/verifications', label: 'Verificaciones', icon: ShieldCheck, accent: true },
  { to: '/admin/jobs', label: 'Ofertas', icon: Briefcase },
  { to: '/admin/posts', label: 'Publicaciones', icon: Newspaper },
  { to: '/admin/reports', label: 'Reportes', icon: Flag },
];

export default function AdminQuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.to}
          to={action.to}
          className="group surface-card flex items-center gap-3 p-4 transition hover:border-app-muted/40"
        >
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${ICON_SURFACE}`}>
            <AppIcon
              icon={action.icon}
              size={ICON_SIZES.default}
              className={action.accent ? ICON_COLORS.positive : ICON_COLORS.default}
            />
          </span>
          <span className="text-sm font-medium text-app-text group-hover:text-primary-700">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
