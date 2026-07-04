import { Link } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import { Briefcase, ChevronRight, MapPin, ICON_SIZES } from '../../../constants/icons';
import { formatSalary } from '../../../utils/formatSalary';

function CompanyJobItem({ job }) {
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-primary-100 bg-white px-4 py-3 transition hover:border-primary-200 hover:bg-primary-50/30"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900">{job.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          {job.city && (
            <span className="inline-flex items-center gap-1">
              <AppIcon icon={MapPin} size={ICON_SIZES.sm} className="text-primary-600" />
              {job.city}
            </span>
          )}
          {job.salary != null && <span>{formatSalary(job.salary)}</span>}
        </div>
      </div>
      <AppIcon icon={ChevronRight} size={ICON_SIZES.default} className="shrink-0 text-primary-600" />
    </Link>
  );
}

export default function CompanyJobsSection({ jobs = [], readOnly = false }) {
  const activeJobs = jobs.filter((job) => job.status === 'active');
  const jobCount = activeJobs.length;
  const manageLink = readOnly ? null : '/company/dashboard';

  return (
    <section className="border-b border-gray-200 bg-white px-4 py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
            <AppIcon icon={Briefcase} size={ICON_SIZES.default} className="text-primary-600" />
          </span>
          <h3 className="text-base font-semibold text-gray-900">Ofertas de empleo</h3>
        </div>
        {jobCount > 0 && manageLink && (
          <Link to={manageLink} className="text-sm font-medium text-primary-600 hover:text-primary-700">
            Ver todas ({jobCount})
          </Link>
        )}
        {jobCount > 0 && readOnly && (
          <span className="text-sm font-medium text-gray-500">{jobCount} activa{jobCount === 1 ? '' : 's'}</span>
        )}
      </div>

      {jobCount === 0 ? (
        <div className="rounded-xl border border-primary-100 bg-gradient-to-b from-primary-50/40 to-white px-4 py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-primary-100 bg-white">
            <AppIcon icon={Briefcase} size={ICON_SIZES.lg} className="text-primary-300" />
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Esta empresa aún no ha publicado ofertas de empleo.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeJobs.map((job) => (
            <CompanyJobItem key={job.id} job={job} />
          ))}
        </div>
      )}
    </section>
  );
}
