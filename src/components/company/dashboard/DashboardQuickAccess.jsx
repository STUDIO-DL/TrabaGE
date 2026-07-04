import { Link } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import {
  Building2,
  Plus,
  Users,
  ICON_SIZES,
} from '../../../constants/icons';

const QUICK_LINKS = [
  { to: '/company/jobs/create', label: 'Crear oferta', icon: Plus, tone: 'text-violet-600 bg-violet-50' },
  { to: '/company/applicants', label: 'Ver candidatos', icon: Users, tone: 'text-blue-600 bg-blue-50' },
  { to: '/company/profile', label: 'Editar perfil', icon: Building2, tone: 'text-amber-600 bg-amber-50' },
];

export default function DashboardQuickAccess() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">Acciones rápidas</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {QUICK_LINKS.map(({ to, label, icon, tone }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center gap-2.5 rounded-2xl border border-gray-100 bg-[#FAFBFC] px-3 py-5 text-center transition hover:border-primary-100 hover:bg-primary-50/30"
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
              <AppIcon icon={icon} size={ICON_SIZES.default} />
            </span>
            <span className="text-xs font-medium leading-snug text-gray-700">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
