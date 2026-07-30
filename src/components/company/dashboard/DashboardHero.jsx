import { Link } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import AppAvatar from '../../common/AppAvatar';
import Button from '../../ui/Button';
import VerifiedBadge from '../VerifiedBadge';
import { Bell, Plus, ICON_SIZES } from '../../../constants/icons';
import { avatarTypeFromCompanyProfile } from '../../../constants/avatarDefaults';
import { isCompanyVerified } from '../../../utils/companyVerification';
import {
  buildSmartSummary,
  formatDashboardDate,
  getGreeting,
} from '../../../features/company-dashboard/dashboardFormatters';
import { ROLES, rolePath } from '../../../constants/roles';
import { useAuth } from '../../../hooks/useAuth';

export default function DashboardHero({
  profile,
  stats,
  unreadCount = 0,
  createLabel = 'Crear oferta',
}) {
  const { role } = useAuth();
  const base = role || ROLES.BUSINESS;
  const name = profile?.company_name?.trim() || 'Tu empresa';
  const verified = isCompanyVerified(profile);
  const avatarType = avatarTypeFromCompanyProfile(profile);
  const smart = buildSmartSummary(stats);
  const meta = [profile?.sector, profile?.city].filter(Boolean).join(' · ');

  return (
    <section className="border-b border-app-divider pb-space-lg">
      <div className="flex flex-col gap-space-md sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-space-md">
          <AppAvatar
            type={avatarType}
            src={profile?.logo_path}
            name={name}
            alt={name}
            size="lg"
            variant="rounded"
            className="h-12 w-12 shrink-0 sm:h-14 sm:w-14"
          />
          <div className="min-w-0">
            <p className="text-caption font-medium text-primary-600">{getGreeting()}</p>
            <div className="mt-space-xs flex flex-wrap items-center gap-space-sm">
              <h1 className="truncate text-title font-semibold tracking-tight text-app-text">
                {name}
              </h1>
              {verified ? <VerifiedBadge size="sm" showTooltip={false} /> : null}
            </div>
            {meta ? <p className="mt-space-xs text-body-small text-app-muted">{meta}</p> : null}
            <p className="mt-space-sm text-caption text-app-subtle">{formatDashboardDate()}</p>
            {smart ? (
              <p className="mt-space-sm text-body-small text-app-text">{smart}</p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-space-sm">
          <Link
            to={rolePath(base, '/notifications')}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-radius-md text-app-muted transition-colors hover:bg-app-surface hover:text-app-text"
            aria-label="Notificaciones"
          >
            <AppIcon icon={Bell} size={ICON_SIZES.default} />
            {unreadCount > 0 ? (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-600 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </Link>
          <Link to={rolePath(base, '/jobs/create')}>
            <Button size="md" className="min-w-[9.5rem]">
              <AppIcon icon={Plus} size={ICON_SIZES.sm} className="text-white" />
              {createLabel}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
