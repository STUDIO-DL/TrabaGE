import { Link, NavLink } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import VerifiedBadge from '../VerifiedBadge';
import {
  Bell,
  Briefcase,
  Building2,
  ChevronRight,
  FileText,
  Headphones,
  LayoutDashboard,
  Newspaper,
  Settings,
  Users,
  ICON_SIZES,
} from '../../../constants/icons';
import { getCompanyLogoUrl } from '../../../constants/images';
import { isCompanyVerified } from '../../../utils/companyVerification';
import { getOrgLabels } from '../../../utils/orgLabels';

const NAV_ITEMS_BASE = [
  { to: '/business/dashboard', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/business/jobs', label: 'Ofertas de trabajo', icon: Briefcase },
  { to: '/business/applicants', label: 'Candidatos', icon: Users },
  { to: '/business/feed', label: 'Publicaciones', icon: Newspaper },
  { to: '/business/notifications', label: 'Notificaciones', icon: Bell },
  { to: '/business/profile', labelKey: 'profile', icon: Building2 },
  { to: '/business/settings', label: 'Configuración', icon: Settings },
];

function getSidebarCompanyLabel(profile, orgLabels) {
  const name = profile?.company_name?.trim();
  return name || orgLabels.defaultName;
}

export default function CompanyDashboardSidebar({ profile }) {
  const orgLabels = getOrgLabels(profile);
  const companyLabel = getSidebarCompanyLabel(profile, orgLabels);
  const logoSrc = getCompanyLogoUrl(profile?.logo_path);
  const verified = isCompanyVerified(profile);
  const navItems = NAV_ITEMS_BASE.map((item) => ({
    ...item,
    label: item.labelKey ? orgLabels[item.labelKey] : item.label,
  }));

  return (
    <aside className="hidden w-[260px] shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
      <div className="px-5 py-5">
        <Link to="/business/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600">
            <AppIcon icon={Briefcase} size={ICON_SIZES.default} className="text-white" />
          </span>
          <span className="text-xl font-bold tracking-tight text-primary-600">TrabaGE</span>
        </Link>
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-2xl border border-primary-100 bg-primary-50/50 p-3">
          <div className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt=""
              className="h-11 w-11 rounded-xl object-cover ring-2 ring-white"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{companyLabel}</p>
              {verified ? (
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-xs text-gray-500">{orgLabels.verified}</span>
                  <VerifiedBadge size="sm" showTooltip={false} />
                </div>
              ) : (
                <p className="mt-0.5 text-xs text-gray-500">{orgLabels.profile}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon, end }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-xl py-2.5 pl-3 pr-3 text-sm font-medium transition',
                isActive
                  ? 'border-l-[3px] border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-l-[3px] border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <AppIcon
                  icon={icon}
                  size={ICON_SIZES.default}
                  className={isActive ? 'text-primary-600' : 'text-gray-400'}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-gray-100 p-4">
        <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
              <AppIcon icon={Headphones} size={ICON_SIZES.default} className="text-primary-600" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">¿Necesitas ayuda?</p>
              <Link
                to="/business/help"
                className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Contactar soporte
                <AppIcon icon={ChevronRight} size={ICON_SIZES.sm} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
