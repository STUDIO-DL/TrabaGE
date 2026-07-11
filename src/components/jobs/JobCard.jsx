import { Link } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import ContentActionMenu from '../common/ContentActionMenu';
import {
  Bookmark,
  Clock,
  MapPin,
  ICON_SIZES,
} from '../../constants/icons';
import Avatar from '../ui/Avatar';
import Chip from '../ui/Chip';
import CompanyNameWithBadge from '../company/CompanyNameWithBadge';
import { REPORT_TARGET_TYPES } from '../../constants/reportReasons';
import { generateJobUrl } from '../../utils/generateShareUrl';
import { formatSalary } from '../../utils/formatSalary';
import TimeAgo from '../common/TimeAgo';
import { getCompanyLogoUrl } from '../../constants/images';
import { getWorkModeLabel } from '../../constants/workModes';
import { getJobTypeLabel } from '../../constants/jobTypes';

export default function JobCard({
  job,
  saved = false,
  onSaveToggle,
  saving = false,
}) {
  if (!job) return null;

  const company = job.company_profiles;
  const detailPath = `/candidate/jobs/${job.id}`;
  const salary = job.salary != null || job.salary_negotiable
    ? formatSalary(job.salary, job.salary_negotiable)
    : null;

  return (
    <article className="rounded-radius-md border border-app-border bg-app-card p-space-md shadow-elevation-1 transition-colors duration-fast ease-out hover:border-app-muted/50">
      <div className="flex gap-space-md">
        <Link to={detailPath} className="shrink-0" aria-label={`Ver ${job.title}`}>
          <Avatar
            src={getCompanyLogoUrl(company?.logo_path)}
            name={company?.company_name}
            size="md"
            className="!rounded-radius-md"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-space-sm">
            <Link to={detailPath} className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-button leading-snug text-app-text">
                {job.title}
              </h3>
            </Link>
            <div className="-mr-1 -mt-1 flex shrink-0 items-center">
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
                className="rounded-radius-sm p-space-sm text-app-subtle transition-colors duration-fast hover:bg-app-surface hover:text-app-muted disabled:cursor-not-allowed disabled:opacity-50"
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

          <CompanyNameWithBadge
            company={company}
            userId={job.company_id}
            nameClassName="text-body-small text-app-muted truncate"
            className="mt-0.5 max-w-full"
          />

          {job.city && (
            <p className="mt-space-xs flex items-center gap-space-xs text-caption text-app-muted">
              <AppIcon icon={MapPin} size={ICON_SIZES.sm} className="shrink-0" />
              <span className="truncate">{job.city}</span>
            </p>
          )}

          {(job.work_mode || job.job_type || salary) && (
            <div className="mt-space-sm flex flex-wrap items-center gap-space-sm">
              {job.work_mode && <Chip variant="default">{getWorkModeLabel(job.work_mode)}</Chip>}
              {job.job_type && <Chip variant="default">{getJobTypeLabel(job.job_type)}</Chip>}
              {salary && <Chip variant="primary">{salary}</Chip>}
            </div>
          )}

          <div className="mt-space-md flex items-center justify-between gap-space-sm">
            {job.created_at ? (
              <span className="flex items-center gap-space-xs text-caption text-app-subtle">
                <AppIcon icon={Clock} size={ICON_SIZES.sm} className="shrink-0" />
                <TimeAgo date={job.created_at} className="truncate" />
              </span>
            ) : (
              <span />
            )}
            <Link
              to={detailPath}
              className="shrink-0 rounded-radius-sm bg-primary-600 px-space-md py-space-sm text-caption font-semibold text-white transition-colors duration-fast hover:bg-primary-700"
            >
              Ver detalles
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
