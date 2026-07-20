import { Link } from 'react-router-dom';
import AppAvatar from '../common/AppAvatar';
import AppIcon from '../common/AppIcon';
import Card from '../ui/Card';
import { AvatarType } from '../../constants/avatarDefaults';
import { Briefcase, ChevronRight, ICON_SIZES } from '../../constants/icons';
import { rolePath } from '../../constants/roles';
import { useAuth } from '../../hooks/useAuth';

function HiringCompanyRow({ company }) {
  const vacancies = company.active_jobs_count ?? company.activeJobsCount ?? 0;
  const label = vacancies === 1 ? '1 vacante' : `${vacancies} vacantes`;

  return (
    <Link
      to={`/companies/${company.company_id ?? company.user_id}`}
      className="flex min-h-touch items-center gap-space-md rounded-radius-md px-space-sm py-space-sm transition-colors duration-fast hover:bg-app-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <AppAvatar
        type={AvatarType.BUSINESS}
        src={company.logo_path}
        name={company.company_name}
        alt={company.company_name}
        size="sm"
        variant="rounded"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-small font-medium text-app-text">{company.company_name}</p>
        <p className="text-caption text-app-muted">{label}</p>
      </div>
      <AppIcon icon={ChevronRight} size={ICON_SIZES.sm} className="shrink-0 text-app-muted" />
    </Link>
  );
}

export default function HiringCompaniesCard({ companies = [], loading }) {
  const { role } = useAuth();
  const viewAllPath = rolePath(role, '/discover/hiring');

  if (loading) return null;

  return (
    <Card elevation={1} className="overflow-hidden p-space-md">
      <div className="mb-space-md flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-radius-md bg-primary-600 text-white">
            <AppIcon icon={Briefcase} size={ICON_SIZES.default} className="text-white" />
          </span>
          <div>
            <h2 className="text-body-small font-semibold text-app-text">Empresas contratando ahora</h2>
            <p className="text-caption text-app-muted">Con ofertas activas</p>
          </div>
        </div>
        <Link
          to={viewAllPath}
          className="shrink-0 text-caption font-medium text-primary-600 hover:text-primary-700"
        >
          Ver todas
        </Link>
      </div>

      {companies.length > 0 ? (
        <ul className="divide-y divide-app-border/60">
          {companies.map((company) => (
            <li key={company.company_id ?? company.user_id}>
              <HiringCompanyRow company={company} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-radius-md bg-app-surface px-space-md py-space-lg text-center text-body-small text-app-muted">
          Aún no hay empresas con vacantes activas. Explora otras oportunidades abajo.
        </p>
      )}
    </Card>
  );
}
