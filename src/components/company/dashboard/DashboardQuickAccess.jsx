import { Link } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import {
  Building2,
  Plus,
  Users,
  ICON_SIZES,
} from '../../../constants/icons';
import { useAuth } from '../../../hooks/useAuth';
import { ROLES, rolePath } from '../../../constants/roles';

export default function DashboardQuickAccess() {
  const { role } = useAuth();
  const base = role || ROLES.BUSINESS;
  const quickLinks = [
    { to: rolePath(base, '/jobs/create'), label: 'Crear oferta', icon: Plus, tone: 'text-violet-600 bg-violet-50' },
    { to: rolePath(base, '/applicants'), label: 'Ver postulaciones', icon: Users, tone: 'text-blue-600 bg-blue-50' },
    { to: rolePath(base, '/profile'), label: 'Editar perfil', icon: Building2, tone: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">Acciones rápidas</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {quickLinks.map(({ to, label, icon: Icon, tone }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-3 transition hover:border-primary-100 hover:bg-primary-50/40"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
              <AppIcon icon={Icon} size={ICON_SIZES.default} />
            </span>
            <span className="text-sm font-medium text-gray-900">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
