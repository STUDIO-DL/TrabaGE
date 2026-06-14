import { Link } from 'react-router-dom';
import { IconBriefcase } from '../profile/ProfileIcons';
import { formatSalary } from '../../utils/formatSalary';
import { formatRelativeTime } from '../../utils/formatDate';
import { JOB_CARD_ACCENTS } from '../../constants/jobSort';
import { IconBookmark, IconMapPin, IconClock, IconChevronRight } from './JobIcons';

function getAccent(index = 0) {
  return JOB_CARD_ACCENTS[index % JOB_CARD_ACCENTS.length];
}

export default function JobCard({ job, accentIndex = 0, saved = false, onSaveToggle }) {
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
          <IconBriefcase className="h-5 w-5" />
        </div>
        <button
          type="button"
          onClick={onSaveToggle}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          aria-label={saved ? 'Quitar de guardados' : 'Guardar empleo'}
        >
          <IconBookmark className="h-5 w-5" filled={saved} />
        </button>
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-gray-900">{job.title}</h3>
        <p className="text-sm text-gray-500">{company?.company_name ?? 'Nombre de empresa'}</p>
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-gray-600">
        {job.city && (
          <div className="flex items-center gap-1.5">
            <IconMapPin className="shrink-0 text-gray-400" />
            <span>{job.city}</span>
          </div>
        )}
        {job.salary != null && (
          <div className="flex items-center gap-1.5">
            <IconBriefcase className="h-4 w-4 shrink-0 text-gray-400" />
            <span>{formatSalary(job.salary)}</span>
          </div>
        )}
        {postedAt && (
          <div className="flex items-center gap-1.5 text-gray-400">
            <IconClock className="shrink-0" />
            <span>Publicado hace {postedAt}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <Link
          to={`/candidate/jobs/${job.id}`}
          className={`inline-flex items-center gap-0.5 text-sm font-semibold ${accent.actionText} hover:opacity-80`}
        >
          Ver detalles
          <IconChevronRight />
        </Link>
      </div>
    </article>
  );
}
