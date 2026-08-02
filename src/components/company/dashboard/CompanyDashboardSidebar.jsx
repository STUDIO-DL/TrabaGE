import { Link, NavLink, useNavigate } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import TrabaGEWordmark from '../../branding/TrabaGEWordmark';
import VerifiedBadge from '../VerifiedBadge';
import {
  Bell,
  Briefcase,
  Building2,
  ChartColumn,
  LayoutDashboard,
  Newspaper,
  Settings,
  Users,
  ICON_SIZES,
} from '../../../constants/icons';
import AppAvatar from '../../common/AppAvatar';
import { avatarTypeFromCompanyProfile } from '../../../constants/avatarDefaults';
import { isCompanyVerified } from '../../../utils/companyVerification';
import { getOrgLabels } from '../../../utils/orgLabels';
import { useAuth } from '../../../hooks/useAuth';
import { ROLES, rolePath } from '../../../constants/roles';
import { exitGuestToAuth } from '../../../utils/guestMode';

const NAV_ITEM_DEFS = [
  { suffix: '/dashboard', label: 'Resumen', icon: LayoutDashboard, end: true },
  { suffix: '/analytics', label: 'Analíticas', icon: ChartColumn },
  { suffix: '/jobs', label: 'Ofertas', icon: Briefcase },
  { suffix: '/applicants', label: 'Candidatos', icon: Users },
  { suffix: '/feed', label: 'Publicaciones', icon: Newspaper },
  { suffix: '/notifications', label: 'Notificaciones', icon: Bell },
  { suffix: '/profile', labelKey: 'profile', icon: Building2 },
  { suffix: '/settings', label: 'Configuración', icon: Settings },
];

function getSidebarCompanyLabel(profile, orgLabels, isPreviewMode) {
  if (isPreviewMode) return 'Nombre de tu empresa';
  const name = profile?.company_name?.trim();
  return name || orgLabels.defaultName;
}

export default function CompanyDashboardSidebar({ profile }) {
  const { role, isPreviewMode } = useAuth();
  const navigate = useNavigate();
  const base = role || ROLES.BUSINESS;
  const orgLabels = getOrgLabels(profile);
  const companyLabel = getSidebarCompanyLabel(profile, orgLabels, isPreviewMode);
  const avatarType = avatarTypeFromCompanyProfile(profile);
  const verified = !isPreviewMode && isCompanyVerified(profile);
  const dashboardPath = rolePath(base, '/dashboard');
  const navItems = NAV_ITEM_DEFS.map((item) => ({
    ...item,
    to: rolePath(base, item.suffix),
    label: item.labelKey ? orgLabels[item.labelKey] : item.label,
  }));

  const handleGuestNav = (event, to) => {
    if (!isPreviewMode) return;
    if (to === dashboardPath) return;
    event.preventDefault();
    exitGuestToAuth(navigate);
  };

  return (
    <aside className="hidden w-[240px] shrink-0 flex-col border-r border-app-border bg-app-card lg:flex">
      <div className="px-space-md py-space-md">
        <Link to={dashboardPath} className="inline-flex">
          <TrabaGEWordmark size="md" />
        </Link>
      </div>

      <div className="border-b border-app-divider px-space-md pb-space-md">
        <div className="flex items-center gap-space-sm">
          <AppAvatar
            type={avatarType}
            src={isPreviewMode ? null : profile?.logo_path}
            name={companyLabel}
            alt={companyLabel}
            size="sm"
            variant="rounded"
            className="h-9 w-9"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-space-xs">
              <p className="truncate text-body-small font-semibold text-app-text">{companyLabel}</p>
              {verified ? <VerifiedBadge size="sm" showTooltip={false} /> : null}
            </div>
            {!verified ? (
              <p className="mt-0.5 truncate text-caption text-app-subtle">
                {isPreviewMode ? 'Sector · Ciudad' : orgLabels.profile}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-space-sm py-space-sm">
        {navItems.map(({ to, label, icon, end }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            onClick={(event) => handleGuestNav(event, to)}
            className={({ isActive }) =>
              [
                'flex items-center gap-space-sm rounded-radius-md px-space-sm py-2 text-body-small font-medium transition-colors duration-fast',
                isActive
                  ? 'bg-app-surface font-semibold text-primary-600'
                  : 'text-app-muted hover:bg-app-surface hover:text-app-text',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <AppIcon
                  icon={icon}
                  size={ICON_SIZES.sm}
                  className={isActive ? 'text-primary-600' : 'text-app-subtle'}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-app-divider px-space-md py-space-md">
        {isPreviewMode ? (
          <button
            type="button"
            onClick={() => exitGuestToAuth(navigate)}
            className="text-caption font-medium text-primary-600 transition-colors hover:text-primary-700"
          >
            Ayuda
          </button>
        ) : (
          <Link
            to={rolePath(base, '/help')}
            className="text-caption font-medium text-primary-600 transition-colors hover:text-primary-700"
          >
            Ayuda
          </Link>
        )}
      </div>
    </aside>
  );
}
