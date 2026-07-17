import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import { Briefcase, ChevronRight, Clock, MapPin, ICON_SIZES } from '../../../constants/icons';
import { formatTimeAgo } from '../../../utils/formatDate';
import { getWorkModeLabel } from '../../../constants/workModes';
import { getJobTypeLabel } from '../../../constants/jobTypes';
import { useAuth } from '../../../hooks/useAuth';
import { ROLES, rolePath } from '../../../constants/roles';
import Select from '../../ui/Select';
import { JOB_TYPES } from '../../../constants/jobTypes';
import { CITIES } from '../../../constants/cities';
import { sectionLinkClass } from './companyProfileStyles';

function CompanyJobItem({ job, variant = 'default' }) {
  const isPreview = variant === 'preview';
  const modality = job.work_mode ? getWorkModeLabel(job.work_mode) : null;
  const locationParts = [job.city, modality].filter(Boolean);
  const dateLabel = formatTimeAgo(job.created_at || job.published_at);
  const jobTypeLabel = job.job_type ? getJobTypeLabel(job.job_type) : null;

  if (isPreview) {
    return (
      <Link
        to={`/jobs/${job.id}`}
        className="group flex min-h-touch items-start gap-space-md py-space-sm transition-colors duration-200 hover:bg-app-surface/60"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-radius-md bg-primary-50 text-primary-600 dark:bg-primary-950/40">
          <AppIcon icon={Briefcase} size={ICON_SIZES.sm} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-small font-semibold text-app-text group-hover:text-primary-700">
            {job.title}
          </p>
          {jobTypeLabel && (
            <p className="mt-0.5 text-caption text-app-muted">{jobTypeLabel}</p>
          )}
          <div className="mt-space-xs flex flex-wrap items-center gap-x-space-md gap-y-space-xs text-caption text-app-muted">
            {locationParts.length > 0 && (
              <span className="inline-flex items-center gap-space-xs">
                <AppIcon icon={MapPin} size={ICON_SIZES.sm} className="text-app-subtle" />
                {locationParts.join(' · ')}
              </span>
            )}
            {dateLabel && (
              <span className="inline-flex items-center gap-space-xs">
                <AppIcon icon={Clock} size={ICON_SIZES.sm} className="text-app-subtle" />
                Publicado {dateLabel.replace(/^Hace /, 'hace ')}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="group flex min-h-touch items-center gap-space-md rounded-radius-md border border-app-border bg-app-surface px-space-base py-space-md transition-colors duration-200 hover:border-primary-200 hover:bg-primary-50/40 dark:hover:bg-primary-950/20"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-radius-md bg-primary-50 text-primary-600 dark:bg-primary-950/40">
        <AppIcon icon={Briefcase} size={ICON_SIZES.sm} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-small font-semibold text-app-text group-hover:text-primary-700">
          {job.title}
        </p>
        <div className="mt-space-xs flex flex-wrap items-center gap-x-space-md gap-y-space-xs text-caption text-app-muted">
          {locationParts.length > 0 && (
            <span className="inline-flex items-center gap-space-xs">
              <AppIcon icon={MapPin} size={ICON_SIZES.sm} className="text-app-subtle" />
              {locationParts.join(' · ')}
            </span>
          )}
          {dateLabel && (
            <span className="inline-flex items-center gap-space-xs">
              <AppIcon icon={Clock} size={ICON_SIZES.sm} className="text-app-subtle" />
              {dateLabel}
            </span>
          )}
        </div>
      </div>
      <AppIcon icon={ChevronRight} size={ICON_SIZES.md} className="shrink-0 text-app-subtle" />
    </Link>
  );
}

function JobFilters({ filters, onChange }) {
  const cityOptions = [
    { value: '', label: 'Todas las ciudades' },
    ...CITIES.map((city) => ({ value: city, label: city })),
  ];
  const typeOptions = [{ value: '', label: 'Todos los tipos' }, ...JOB_TYPES];

  return (
    <div className="mb-space-base grid grid-cols-1 gap-space-sm sm:grid-cols-2">
      <Select
        label="Ciudad"
        value={filters.city || ''}
        onChange={(event) => onChange?.({ ...filters, city: event.target.value || undefined })}
        options={cityOptions}
      />
      <Select
        label="Tipo de empleo"
        value={filters.jobType || ''}
        onChange={(event) => onChange?.({ ...filters, jobType: event.target.value || undefined })}
        options={typeOptions}
      />
    </div>
  );
}

function filterJobs(jobs, filters) {
  return jobs.filter((job) => {
    if (filters.city && job.city !== filters.city) return false;
    if (filters.jobType && job.job_type !== filters.jobType) return false;
    return true;
  });
}

function JobsEmptyState({ readOnly, manageLink }) {
  return (
    <div className="rounded-radius-md border border-dashed border-app-border bg-app-surface px-space-base py-space-lg text-center">
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-radius-md bg-primary-50 text-primary-600 dark:bg-primary-950/40">
        <AppIcon icon={Briefcase} size={ICON_SIZES.md} />
      </div>
      <p className="mt-space-sm text-body-small text-app-muted">
        {readOnly
          ? 'Esta empresa aún no ha publicado ofertas de empleo.'
          : 'Publica tu primera oferta desde el panel de empleos.'}
      </p>
      {!readOnly && manageLink && (
        <Link to={manageLink} className={`mt-space-sm inline-block ${sectionLinkClass}`}>
          Ir al panel
        </Link>
      )}
    </div>
  );
}

export default function CompanyJobsSection({
  jobs = [],
  readOnly = false,
  maxVisible,
  onViewAll,
  variant = 'preview',
  showTitle = true,
  embedded = false,
}) {
  const { role } = useAuth();
  const [filters, setFilters] = useState({});
  const activeJobs = useMemo(
    () => jobs.filter((job) => job.status === 'active'),
    [jobs],
  );
  const filteredJobs = useMemo(
    () => (variant === 'full' ? filterJobs(activeJobs, filters) : activeJobs),
    [activeJobs, filters, variant],
  );
  const jobCount = activeJobs.length;
  const manageLink = readOnly ? null : rolePath(role || ROLES.BUSINESS, '/dashboard');
  const limit = maxVisible ?? filteredJobs.length;
  const visibleJobs = filteredJobs.slice(0, limit);
  const hasMore = filteredJobs.length > limit;
  const isPreview = variant === 'preview';

  const listContent = jobCount === 0 ? (
    <JobsEmptyState readOnly={readOnly} manageLink={manageLink} />
  ) : (
    <>
      <div className={isPreview ? 'divide-y divide-app-border' : 'space-y-space-sm'}>
        {visibleJobs.map((job) => (
          <CompanyJobItem key={job.id} job={job} variant={isPreview ? 'preview' : 'default'} />
        ))}
      </div>
      {hasMore && onViewAll && (
        <button type="button" onClick={onViewAll} className={`mt-space-sm ${sectionLinkClass}`}>
          Ver todos ({jobCount})
        </button>
      )}
    </>
  );

  if (variant === 'full') {
    return (
      <section className="px-space-base py-space-base">
        {jobCount > 0 && <JobFilters filters={filters} onChange={setFilters} />}
        {listContent}
        {filteredJobs.length === 0 && jobCount > 0 && (
          <p className="py-space-base text-center text-body-small text-app-muted">
            No hay empleos que coincidan con los filtros.
          </p>
        )}
      </section>
    );
  }

  if (embedded) {
    return listContent;
  }

  return (
    <section className="px-space-base py-space-base">
      {showTitle && (
        <div className="mb-space-sm flex items-center justify-between gap-space-sm">
          <h3 className="text-subtitle font-semibold text-app-text">Empleos activos</h3>
          <div className="flex items-center gap-space-md">
            {jobCount > 0 && onViewAll && (
              <button type="button" onClick={onViewAll} className={sectionLinkClass}>
                Ver todos
              </button>
            )}
            {jobCount > 0 && manageLink && (
              <Link to={manageLink} className={sectionLinkClass}>
                Gestionar
              </Link>
            )}
          </div>
        </div>
      )}
      {listContent}
    </section>
  );
}
