import { Link } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import AppAvatar from '../../common/AppAvatar';
import Button from '../../ui/Button';
import { AvatarType } from '../../../constants/avatarDefaults';
import { ChevronRight, Users, ICON_SIZES } from '../../../constants/icons';
import { useAuth } from '../../../hooks/useAuth';
import { ROLES, rolePath } from '../../../constants/roles';
import DashboardSectionEmpty from './DashboardSectionEmpty';
import { getUserProfilePath } from '../../../utils/profileRoutes';
import {
  formatRelativeTime,
  funnelStatusLabel,
  funnelStatusTone,
} from '../../../features/company-dashboard/dashboardFormatters';

const STATUS_CLASS = {
  success: 'bg-success-600/10 text-success-700 dark:text-success-400',
  danger: 'bg-error-600/10 text-error-700 dark:text-error-400',
  pending: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
};

export default function DashboardRecentCandidates({ candidates = [] }) {
  const { role } = useAuth();
  const base = role || ROLES.BUSINESS;

  return (
    <section className="surface-card">
      <div className="flex items-center justify-between gap-3 border-b border-app-border px-5 py-4">
        <h2 className="text-base font-semibold text-app-text">Candidaturas recientes</h2>
        <Link
          to={rolePath(base, '/applicants')}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          Ver todos
          <AppIcon icon={ChevronRight} size={ICON_SIZES.sm} />
        </Link>
      </div>

      {candidates.length === 0 ? (
        <DashboardSectionEmpty
          icon={Users}
          title="Aún no tienes candidatos"
          description="Cuando alguien aplique a tus ofertas, aparecerá aquí."
          compact
        />
      ) : (
        <ul className="divide-y divide-app-border">
          {candidates.map((candidate) => {
            const tone = funnelStatusTone(candidate.funnel_status || candidate.status);
            const profileTo = candidate.user_id
              ? getUserProfilePath(candidate.user_id, 'personal')
              : rolePath(base, '/applicants');

            return (
              <li key={candidate.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <AppAvatar
                  type={AvatarType.PERSONAL}
                  src={candidate.avatar_path}
                  name={candidate.full_name}
                  alt={candidate.full_name}
                  size="md"
                  className="h-10 w-10"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-app-text">{candidate.full_name}</p>
                  <p className="mt-0.5 truncate text-xs text-app-muted">{candidate.job_title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[tone] || STATUS_CLASS.pending}`}
                    >
                      {funnelStatusLabel(candidate.funnel_status || candidate.status)}
                    </span>
                    <span className="text-xs text-app-subtle">
                      {formatRelativeTime(candidate.applied_at)}
                    </span>
                  </div>
                </div>
                <Link to={profileTo}>
                  <Button variant="secondary" size="sm" type="button">
                    Ver perfil
                  </Button>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
