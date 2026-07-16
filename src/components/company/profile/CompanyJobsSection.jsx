import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import { Briefcase, ChevronRight, MapPin, ICON_SIZES } from '../../../constants/icons';
import { formatSalary } from '../../../utils/formatSalary';
import { useAuth } from '../../../hooks/useAuth';
import { ROLES, rolePath } from '../../../constants/roles';
import Select from '../../ui/Select';
import Button from '../../ui/Button';
import { JOB_TYPES } from '../../../constants/jobTypes';
import { CITIES } from '../../../constants/cities';

function CompanyJobItem({ job }) {
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="flex min-h-touch items-center justify-between gap-space-md rounded-radius-md border border-app-border bg-app-card px-space-base py-space-md transition-colors duration-fast hover:border-app-muted/50 hover:bg-app-surface"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-app-text">{job.title}</p>
        <div className="mt-space-xs flex flex-wrap items-center gap-x-space-md gap-y-space-xs text-caption text-app-muted">
          {job.city && (
            <span className="inline-flex items-center gap-space-xs">
              <AppIcon icon={MapPin} size={ICON_SIZES.sm} className="text-app-subtle" />
              {job.city}
            </span>
          )}
          {(job.salary || job.salary_negotiable) && (
            <span>{formatSalary(job.salary, job.salary_negotiable)}</span>
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

export default function CompanyJobsSection({
  jobs = [],
  readOnly = false,
  maxVisible,
  onViewAll,
  variant = 'preview',
  showTitle = true,
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

  const content = (
    <>
      {jobCount === 0 ? (
        <div className="rounded-radius-md border border-app-border bg-app-surface px-space-base py-space-xl text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-radius-md bg-app-card">
            <AppIcon icon={Briefcase} size={ICON_SIZES.lg} className="text-app-subtle" />
          </div>
          <p className="mt-space-base text-body-small text-app-muted">
            {readOnly
              ? 'Esta empresa aún no ha publicado ofertas de empleo.'
              : 'Publica tu primera oferta desde el panel de empleos.'}
          </p>
          {!readOnly && manageLink && (
            <Link
              to={manageLink}
              className="mt-space-base inline-block text-body-small font-medium text-primary-600 hover:text-primary-700"
            >
              Ir al panel
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-space-sm">
            {visibleJobs.map((job) => (
              <CompanyJobItem key={job.id} job={job} />
            ))}
          </div>
          {hasMore && onViewAll && (
            <Button type="button" variant="ghost" fullWidth className="mt-space-base" onClick={onViewAll}>
              Ver todos ({jobCount})
            </Button>
          )}
        </>
      )}
    </>
  );

  if (variant === 'full') {
    return (
      <section className="px-space-base py-space-base">
        {jobCount > 0 && <JobFilters filters={filters} onChange={setFilters} />}
        {content}
        {filteredJobs.length === 0 && jobCount > 0 && (
          <p className="py-space-base text-center text-body-small text-app-muted">
            No hay empleos que coincidan con los filtros.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="px-space-base py-space-base">
      {showTitle && (
        <div className="mb-space-base flex items-center justify-between gap-space-sm">
          <h3 className="text-body font-semibold text-app-text">Empleos activos</h3>
          {jobCount > 0 && manageLink && (
            <Link
              to={manageLink}
              className="text-body-small font-medium text-primary-600 hover:text-primary-700"
            >
              Gestionar
            </Link>
          )}
        </div>
      )}
      {content}
    </section>
  );
}
