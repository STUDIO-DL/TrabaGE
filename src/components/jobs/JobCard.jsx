import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import ContentActionMenu from '../common/ContentActionMenu';
import { Bookmark, ICON_SIZES } from '../../constants/icons';
import AppAvatar from '../common/AppAvatar';
import CompanyNameWithBadge from '../company/CompanyNameWithBadge';
import { AvatarType, avatarTypeFromCompanyProfile } from '../../constants/avatarDefaults';
import { REPORT_TARGET_TYPES } from '../../constants/reportReasons';
import { generateJobUrl } from '../../utils/generateShareUrl';
import { getWorkModeLabel } from '../../constants/workModes';
import {
  getSharedPublisherAvatar,
  getSharedPublisherName,
  isJobOwner,
  isSharedOpportunity,
} from '../../constants/jobSource';
import { formatSalary, hasSalaryDisplay } from '../../utils/formatSalary';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { jobsService } from '../../services/jobs.service';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { TOAST } from '../../utils/copyLabels';

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

function JobSourceBadge({ job }) {
  if (isSharedOpportunity(job)) {
    const publisherName = getSharedPublisherName(job);
    return (
      <p className="mb-1.5 text-caption leading-tight text-app-muted">
        <span aria-hidden="true">👤 </span>
        <span className="font-medium text-app-text">Oportunidad compartida</span>
        {publisherName ? (
          <span className="text-app-subtle">{` · publicada por '${publisherName}'`}</span>
        ) : null}
      </p>
    );
  }

  return (
    <p className="mb-1.5 text-caption leading-tight text-app-muted">
      <span aria-hidden="true">🏢 </span>
      <span className="font-medium text-app-text">Oferta oficial</span>
    </p>
  );
}

export default function JobCard({
  job,
  saved = false,
  onSaveToggle,
  saving = false,
  onDeleted,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotificationContext();
  const [removed, setRemoved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!job || removed) return null;

  const shared = isSharedOpportunity(job);
  const owner = isJobOwner(job, user?.id);
  const company = job.company_profiles;
  const publisherName = getSharedPublisherName(job);
  const avatarType = shared ? AvatarType.PERSONAL : avatarTypeFromCompanyProfile(company);
  const avatarSrc = shared ? getSharedPublisherAvatar(job) : company?.logo_path;
  const avatarName = shared ? publisherName : company?.company_name;
  const detailPath = `/personal/jobs/${job.id}`;
  const shareTitle = shared
    ? (publisherName ? `${job.title} - ${publisherName}` : job.title)
    : (company?.company_name ? `${job.title} - ${company.company_name}` : job.title);

  const openDetails = () => {
    navigate(detailPath);
  };

  const handleCardKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDetails();
    }
  };

  const handleSaveClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSaveToggle?.();
  };

  const handleDelete = async () => {
    const ok = window.confirm('¿Eliminar esta oferta? Esta acción no se puede deshacer.');
    if (!ok) return;

    setDeleting(true);
    const { error } = await jobsService.deleteJob(job.id);
    setDeleting(false);

    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }

    setRemoved(true);
    onDeleted?.(job.id);
    showToast(TOAST.jobDeleted, 'success');
  };

  const stopCardNavigation = (event) => {
    event.stopPropagation();
  };

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={handleCardKeyDown}
      className="relative min-w-0 max-w-full cursor-pointer overflow-hidden rounded-radius-md border border-app-border bg-app-card p-space-base surface-press transition-colors duration-fast ease-out hover:bg-app-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-100 active:bg-app-surface"
      aria-label={`Ver oferta: ${job.title}`}
    >
      {/* Visually hidden link for progressive enhancement / crawlers */}
      <Link to={detailPath} tabIndex={-1} className="sr-only">
        {job.title}
      </Link>

      <JobSourceBadge job={job} />

      <div className="flex items-start gap-3">
        <AppAvatar
          type={avatarType}
          src={avatarSrc}
          name={avatarName}
          alt={avatarName}
          size="md"
          variant="rounded"
          className="!rounded-radius-sm shrink-0"
        />

        <div className="min-w-0 flex-1 space-y-0.5 pr-1">
          <h3 className="text-user-content text-body font-semibold leading-snug tracking-tight text-app-text">
            {job.title}
          </h3>

          {shared ? (
            publisherName ? (
              <p className="truncate text-caption leading-tight text-app-muted">
                {publisherName}
              </p>
            ) : null
          ) : (
            <CompanyNameWithBadge
              company={company}
              userId={job.company_id}
              linkToProfile={false}
              nameClassName="text-caption leading-tight text-app-muted truncate"
              className="max-w-full"
            />
          )}

          <JobLocationLine city={job.city} workMode={job.work_mode} />

          {hasSalaryDisplay(job.salary, job.salary_negotiable) ? (
            <p className="truncate text-caption leading-tight text-app-subtle">
              {formatSalary(job.salary, job.salary_negotiable)}
            </p>
          ) : null}
        </div>

        <div
          className="-mr-1 -mt-0.5 flex shrink-0 items-center"
          onClick={stopCardNavigation}
          onKeyDown={stopCardNavigation}
        >
          <ContentActionMenu
            shareUrl={generateJobUrl(job.id)}
            shareTitle={shareTitle}
            shareText="Encontré esta oferta de empleo en TrabaGE."
            targetType={REPORT_TARGET_TYPES.JOB}
            targetId={job.id}
            onDelete={owner ? handleDelete : undefined}
            deleteLabel={deleting ? 'Eliminando...' : 'Eliminar oferta'}
          />
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={!onSaveToggle || saving}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-radius-sm text-app-subtle transition-colors duration-fast hover:bg-app-surface hover:text-app-muted disabled:cursor-not-allowed disabled:opacity-50"
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
