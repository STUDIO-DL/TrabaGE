import { Link } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import ContentActionMenu from '../common/ContentActionMenu';
import { Bookmark, ICON_SIZES } from '../../constants/icons';
import AppAvatar from '../common/AppAvatar';
import CompanyNameWithBadge from '../company/CompanyNameWithBadge';
import { avatarTypeFromCompanyProfile } from '../../constants/avatarDefaults';
import { REPORT_TARGET_TYPES } from '../../constants/reportReasons';
import { generateJobUrl } from '../../utils/generateShareUrl';
import { getWorkModeLabel } from '../../constants/workModes';
import { getUserProfilePath } from '../../utils/profileRoutes';

function JobLocationLine({ city, workMode }) {
  if (!city && !workMode) return null;

  const modeLabel = workMode ? getWorkModeLabel(workMode) : null;

  return (
    <p className="truncate text-caption leading-tight text-app-subtle">
      {city && <span>{city}</span>}
      {city && modeLabel && <span>{' '}</span>}
      {modeLabel && (
        <span className="text-primary-600 dark:text-primary-400">({modeLabel})</span>
      )}
    </p>
  );
}

export default function JobCard({
  job,
  saved = false,
  onSaveToggle,
  saving = false,
}) {
  if (!job) return null;

  const company = job.company_profiles;
  const avatarType = avatarTypeFromCompanyProfile(company);
  const detailPath = `/personal/jobs/${job.id}`;
  const companyProfilePath = job.company_id
    ? getUserProfilePath(job.company_id, 'company')
    : null;

  return (
    <article className="min-w-0 max-w-full overflow-hidden rounded-radius-md border border-app-border bg-app-surface p-3 shadow-elevation-1 transition-colors duration-fast ease-out hover:border-primary-200/70 hover:bg-primary-50/30 dark:hover:bg-primary-950/20">
      <div className="flex items-start gap-3">
        {companyProfilePath ? (
          <Link
            to={companyProfilePath}
            className="shrink-0"
            aria-label={`Ver perfil de ${company?.company_name ?? 'empresa'}`}
          >
            <AppAvatar
              type={avatarType}
              src={company?.logo_path}
              name={company?.company_name}
              alt={company?.company_name}
              size="md"
              variant="rounded"
              className="!rounded-radius-sm"
            />
          </Link>
        ) : (
          <Link to={detailPath} className="shrink-0" aria-label={`Ver ${job.title}`}>
            <AppAvatar
              type={avatarType}
              src={company?.logo_path}
              name={company?.company_name}
              alt={company?.company_name}
              size="md"
              variant="rounded"
              className="!rounded-radius-sm"
            />
          </Link>
        )}

        <div className="min-w-0 flex-1 space-y-0.5">
          <Link to={detailPath} className="block min-w-0">
            <h3 className="text-user-content text-body-small font-semibold leading-tight text-app-text">
              {job.title}
            </h3>
          </Link>

          <CompanyNameWithBadge
            company={company}
            userId={job.company_id}
            nameClassName="text-caption leading-tight text-app-muted truncate"
            className="max-w-full"
          />

          <JobLocationLine city={job.city} workMode={job.work_mode} />
        </div>

        <div className="-mr-1 -mt-0.5 flex shrink-0 items-center">
          <ContentActionMenu
            shareUrl={generateJobUrl(job.id)}
            shareTitle={company?.company_name ? `${job.title} - ${company.company_name}` : job.title}
            shareText="Encontré esta oferta de empleo en TrabaGE."
            targetType={REPORT_TARGET_TYPES.JOB}
            targetId={job.id}
          />
          <button
            type="button"
            onClick={onSaveToggle}
            disabled={!onSaveToggle || saving}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-sm text-app-subtle transition-colors duration-fast hover:bg-primary-50/60 hover:text-app-muted disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-primary-950/30"
            aria-label={saved ? 'Quitar de guardados' : 'Guardar empleo'}
            aria-pressed={saved}
          >
            <AppIcon
              icon={Bookmark}
              size={ICON_SIZES.md}
              className={saved ? 'fill-current text-primary-600' : ''}
            />
          </button>
        </div>
      </div>
    </article>
  );
}
