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
import CompanyNameWithBadge from '../company/CompanyNameWithBadge';
import { REPORT_TARGET_TYPES } from '../../constants/reportReasons';
import { generateJobUrl } from '../../utils/generateShareUrl';
import { formatSalary } from '../../utils/formatSalary';
import TimeAgo from '../common/TimeAgo';
import { getCompanyLogoUrl } from '../../constants/images';
import { getWorkModeLabel } from '../../constants/workModes';
import { getJobTypeLabel } from '../../constants/jobTypes';

function MetaChip({ children }) {
  return (
    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      {children}
    </span>
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
  const detailPath = `/candidate/jobs/${job.id}`;
  const salary = job.salary != null || job.salary_negotiable
    ? formatSalary(job.salary, job.salary_negotiable)
    : null;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-gray-300">
      <div className="flex gap-3">
        <Link to={detailPath} className="shrink-0" aria-label={`Ver ${job.title}`}>
          <Avatar
            src={getCompanyLogoUrl(company?.logo_path)}
            name={company?.company_name}
            size="md"
            className="!rounded-lg"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <Link to={detailPath} className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900">
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
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={saved ? 'Quitar de guardados' : 'Guardar empleo'}
                aria-pressed={saved}
              >
                <AppIcon
                  icon={Bookmark}
                  size={ICON_SIZES.default}
                  className={saved ? 'fill-current text-primary-600' : ''}
                />
              </button>
            </div>
          </div>

          <CompanyNameWithBadge
            company={company}
            userId={job.company_id}
            nameClassName="text-sm text-gray-500 truncate"
            className="mt-0.5 max-w-full"
          />

          {job.city && (
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <AppIcon icon={MapPin} size={ICON_SIZES.sm} className="shrink-0" />
              <span className="truncate">{job.city}</span>
            </p>
          )}

          {(job.work_mode || job.job_type || salary) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {job.work_mode && <MetaChip>{getWorkModeLabel(job.work_mode)}</MetaChip>}
              {job.job_type && <MetaChip>{getJobTypeLabel(job.job_type)}</MetaChip>}
              {salary && <MetaChip>{salary}</MetaChip>}
            </div>
          )}

          <div className="mt-2.5 flex items-center justify-between gap-2">
            {job.created_at ? (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <AppIcon icon={Clock} size={ICON_SIZES.sm} className="shrink-0" />
                <TimeAgo date={job.created_at} className="truncate" />
              </span>
            ) : (
              <span />
            )}
            <Link
              to={detailPath}
              className="shrink-0 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
            >
              Ver detalles
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
