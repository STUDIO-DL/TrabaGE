import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../../common/AppIcon';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import { Briefcase, Clock, MapPin, ICON_SIZES } from '../../../constants/icons';
import { formatTimeAgo } from '../../../utils/formatDate';
import { formatSalary } from '../../../utils/formatSalary';
import { getWorkModeLabel } from '../../../constants/workModes';
import { useAuth } from '../../../hooks/useAuth';
import { ROLES, rolePath } from '../../../constants/roles';
import Select from '../../ui/Select';
import { JOB_TYPES } from '../../../constants/jobTypes';
import { CITIES } from '../../../constants/cities';
import { getEmptyJobsCopy, getEmptyJobsOwnHint, resolveOrgViewerContext } from '../../../utils/copyLabels';
import { sectionLinkClass, JOB_STATUS_LABELS } from './companyProfileStyles';

const STATUS_VARIANTS = {
  draft: 'default',
  active: 'success',
  paused: 'pending',
  closed: 'default',
};

function CompanyJobCard({ job }) {
  const modality = job.work_mode ? getWorkModeLabel(job.work_mode) : null;
  const salary = formatSalary(job.salary, job.salary_negotiable);
  const dateLabel = formatTimeAgo(job.created_at || job.published_at);
  const statusLabel = JOB_STATUS_LABELS[job.status] ?? JOB_STATUS_LABELS.active;
  const statusVariant = STATUS_VARIANTS[job.status] ?? 'success';

  return (
    <article className="flex flex-col gap-space-md rounded-radius-lg border border-app-border bg-app-card p-space-base shadow-elevation-1">
      <div className="min-w-0 space-y-space-sm">
        <h4 className="line-clamp-2 text-body-small font-semibold leading-snug text-app-text">
          {job.title}
        </h4>

        {job.city ? (
          <p className={`flex items-center gap-space-sm text-caption text-app-muted`}>
            <AppIcon icon={MapPin} size={ICON_SIZES.sm} className="shrink-0 text-app-text" />
            <span className="truncate">{job.city}</span>
          </p>
        ) : null}

        {modality ? (
          <p className="flex items-center gap-space-sm text-caption text-app-muted">
            <AppIcon icon={Briefcase} size={ICON_SIZES.sm} className="shrink-0 text-app-text" />
            <span>{modality}</span>
          </p>
        ) : null}

        <p className="text-caption font-medium text-app-text">{salary}</p>
      </div>

      <div className="flex items-center justify-between gap-space-sm border-t border-app-divider pt-space-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-space-sm">
          <Badge label={statusLabel} variant={statusVariant} />
          {dateLabel ? (
            <span className="inline-flex items-center gap-space-xs text-caption text-app-subtle">
              <AppIcon icon={Clock} size={ICON_SIZES.sm} className="text-app-text" />
              {dateLabel}
            </span>
          ) : null}
        </div>
        <Link to={`/jobs/${job.id}`} className="shrink-0">
          <Button variant="secondary" size="sm" type="button">
            Ver
          </Button>
        </Link>
      </div>
    </article>
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

function JobsEmptyState({ readOnly, manageLink, profile }) {
  const viewer = resolveOrgViewerContext({ isOwn: !readOnly, profile });
  return (
    <div className="rounded-radius-lg border border-dashed border-app-border bg-app-surface px-space-base py-space-xl text-left">
      <span className="flex h-11 w-11 items-center justify-center rounded-radius-md bg-app-surface ring-1 ring-app-border">
        <AppIcon icon={Briefcase} size={ICON_SIZES.lg} className="text-app-text" />
      </span>
      <p className="mt-space-sm text-body-small text-app-muted">
        {readOnly ? getEmptyJobsCopy(viewer) : getEmptyJobsOwnHint()}
      </p>
      {!readOnly && manageLink ? (
        <Link to={manageLink} className={`mt-space-sm inline-block ${sectionLinkClass}`}>
          Ir al panel
        </Link>
      ) : null}
    </div>
  );
}

export default function CompanyJobsSection({
  jobs = [],
  readOnly = false,
  profile = null,
  maxVisible,
  onViewAll,
  variant = 'preview',
  showTitle = true,
  embedded = false,
}) {
  const { role } = useAuth();
  const [filters, setFilters] = useState({});
  const activeJobs = useMemo(() => jobs.filter((job) => job.status === 'active'), [jobs]);
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

  const listContent =
    jobCount === 0 ? (
      <JobsEmptyState readOnly={readOnly} manageLink={manageLink} profile={profile} />
    ) : (
      <>
        <div className="space-y-space-sm">
          {visibleJobs.map((job) => (
            <CompanyJobCard key={job.id} job={job} />
          ))}
        </div>
        {hasMore && onViewAll ? (
          <button type="button" onClick={onViewAll} className={`mt-space-md ${sectionLinkClass}`}>
            Ver todos ({jobCount})
          </button>
        ) : null}
      </>
    );

  if (variant === 'full') {
    return (
      <section className={embedded ? undefined : 'px-space-base py-space-base'}>
        {jobCount > 0 ? <JobFilters filters={filters} onChange={setFilters} /> : null}
        {listContent}
        {filteredJobs.length === 0 && jobCount > 0 ? (
          <p className="py-space-base text-left text-body-small text-app-muted">
            No hay ofertas que coincidan con los filtros seleccionados.
          </p>
        ) : null}
      </section>
    );
  }

  if (embedded) return listContent;

  return (
    <section className="px-space-base py-space-base">
      {showTitle ? (
        <div className="mb-space-md flex items-center justify-between gap-space-sm">
          <h3 className="text-subtitle font-semibold text-app-text">Ofertas de empleo</h3>
          <div className="flex items-center gap-space-md">
            {jobCount > 0 && onViewAll ? (
              <button type="button" onClick={onViewAll} className={sectionLinkClass}>
                Ver todos
              </button>
            ) : null}
            {jobCount > 0 && manageLink ? (
              <Link to={manageLink} className={sectionLinkClass}>
                Gestionar
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
      {listContent}
    </section>
  );
}
