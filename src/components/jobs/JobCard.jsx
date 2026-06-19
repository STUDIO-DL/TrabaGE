import { Link } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import ContentActionMenu from '../common/ContentActionMenu';
import {
  Briefcase,
  Bookmark,
  ChevronRight,
  Clock,
  Eye,
  MapPin,
  ICON_COLORS,
  ICON_SIZES,
} from '../../constants/icons';
import CompanyNameWithBadge from '../company/CompanyNameWithBadge';
import { REPORT_TARGET_TYPES } from '../../constants/reportReasons';
import { generateJobUrl } from '../../utils/generateShareUrl';
import { formatSalary } from '../../utils/formatSalary';
import { formatRelativeTime } from '../../utils/formatDate';
import { JOB_CARD_ACCENTS } from '../../constants/jobSort';

function getAccent(index = 0) {
  return JOB_CARD_ACCENTS[index % JOB_CARD_ACCENTS.length];
}

export default function JobCard({ job, accentIndex = 0, saved = false, onSaveToggle, matchScore }) {
  if (!job) return null;

  const company = job.company_profiles;
  const accent = getAccent(accentIndex);
  const postedAt = job.created_at ? formatRelativeTime(job.created_at) : null;

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent.iconBg} ${accent.iconText}`}
        >
          <AppIcon icon={Briefcase} size={ICON_SIZES.default} />
        </div>
        <div className="flex items-center gap-1">
          <ContentActionMenu
            shareUrl={generateJobUrl(job.id)}
            shareTitle={job.title}
            targetType={REPORT_TARGET_TYPES.JOB}
            targetId={job.id}
          />
          <button
            type="button"
            onClick={onSaveToggle}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            aria-label={saved ? 'Quitar de guardados' : 'Guardar empleo'}
          >
            <AppIcon
              icon={Bookmark}
              size={ICON_SIZES.default}
              className={saved ? 'fill-current text-primary-600' : ''}
            />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-gray-900">{job.title}</h3>
          {typeof matchScore === 'number' && matchScore > 0 && (
            <span className="shrink-0 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
              {matchScore}% compatible
            </span>
          )}
        </div>
        <CompanyNameWithBadge company={company} showUnverifiedLabel />
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-gray-600">
        {job.city && (
          <div className="flex items-center gap-1.5">
            <AppIcon icon={MapPin} size={ICON_SIZES.default} className={ICON_COLORS.muted} />
            <span>{job.city}</span>
          </div>
        )}
        {(job.salary != null || job.salary_negotiable) && (
          <div className="flex items-center gap-1.5">
            <AppIcon icon={Briefcase} size={ICON_SIZES.default} className={ICON_COLORS.muted} />
            <span>{formatSalary(job.salary, job.salary_negotiable)}</span>
          </div>
        )}
        {postedAt && (
          <div className="flex items-center gap-1.5 text-gray-400">
            <AppIcon icon={Clock} size={ICON_SIZES.default} className="shrink-0" />
            <span>Publicado hace {postedAt}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <Link
          to={`/candidate/jobs/${job.id}`}
          className={`inline-flex items-center gap-1 text-sm font-semibold ${accent.actionText} hover:opacity-80`}
        >
          <AppIcon icon={Eye} size={ICON_SIZES.default} />
          Ver detalles
          <AppIcon icon={ChevronRight} size={ICON_SIZES.default} />
        </Link>
      </div>
    </article>
  );
}
