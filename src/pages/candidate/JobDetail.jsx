import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FormPageLayout from '../../components/layout/FormPageLayout';
import ApplicationsCounter from '../../components/jobs/ApplicationsCounter';
import CompanyNameWithBadge from '../../components/company/CompanyNameWithBadge';
import ContentActionMenu from '../../components/common/ContentActionMenu';
import Card from '../../components/ui/Card';
import { isCompanyVerified } from '../../utils/companyVerification';
import Button from '../../components/ui/Button';
import AppIcon from '../../components/common/AppIcon';
import { JobDetailSkeleton } from '../../components/common/Skeleton';
import TimeAgo from '../../components/common/TimeAgo';
import { Bookmark, Clock, FileText, ICON_SIZES } from '../../constants/icons';
import { REPORT_TARGET_TYPES } from '../../constants/reportReasons';
import { generateJobUrl } from '../../utils/generateShareUrl';
import { useJob } from '../../hooks/useJobs';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { analyticsService } from '../../services/analytics.service';
import { applicationsService } from '../../services/applications.service';
import { jobsService } from '../../services/jobs.service';
import { formatSalary } from '../../utils/formatSalary';
import { getWorkModeLabel } from '../../constants/workModes';
import { getJobTypeLabel } from '../../constants/jobTypes';
import { parseBenefits, parseRequirements } from '../../utils/jobParsing';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import { useSavedJobs } from '../../hooks/useSavedJobs';
import { useSimilarJobAlerts } from '../../hooks/useSimilarJobAlerts';
import { ROLES } from '../../constants/roles';

function JobSection({ title, children }) {
  if (!children) return null;
  return (
    <section className="space-y-space-sm">
      <h3 className="text-body font-semibold text-app-text">{title}</h3>
      <div className="text-body-small leading-relaxed text-app-text">{children}</div>
    </section>
  );
}

function JobBulletList({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="list-disc space-y-space-xs pl-space-md">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function JobMetadataLine({ children }) {
  if (!children) return null;
  return <p className="text-body-small text-app-text">{children}</p>;
}

function SimilarJobAlertToggle({ userId, job, canUseCandidateActions, showToast }) {
  const { enabled, toggle, alertLabel, canUse } = useSimilarJobAlerts(userId, job);

  if (!canUseCandidateActions || !canUse) return null;

  const handleToggle = () => {
    const next = toggle();
    showToast(
      next ? 'Alerta activada para empleos similares' : 'Alerta desactivada',
      'success',
    );
  };

  return (
    <div className="rounded-radius-md border border-app-border bg-app-card px-space-base py-space-md">
      <div className="flex items-center justify-between gap-space-md">
        <div className="min-w-0 flex-1">
          <p className="text-body-small font-semibold text-app-text">
            Recibir alertas de empleos similares
          </p>
          {alertLabel ? (
            <p className="mt-space-xs truncate text-caption text-app-muted">{alertLabel}</p>
          ) : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Recibir alertas de empleos similares"
          onClick={handleToggle}
          className={[
            'relative h-7 w-12 shrink-0 rounded-full p-0.5 transition-all duration-200 ease-out',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2',
            enabled
              ? 'bg-primary-600 shadow-[0_8px_18px_rgba(37,99,235,0.24)]'
              : 'bg-slate-200',
            'active:scale-95',
          ].join(' ')}
        >
          <span
            className={[
              'block h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out',
              enabled ? 'translate-x-5' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </div>
    </div>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isPreviewMode, user, role } = useAuth();
  const { showToast } = useNotificationContext();
  const { job, loading } = useJob(id);
  const { isSaved, toggleSavedJob, actionLoadingId } = useSavedJobs();
  const [applicationCount, setApplicationCount] = useState(0);
  const [application, setApplication] = useState(null);
  const company = job?.company_profiles;

  useEffect(() => {
    if (!user?.id || !id || loading || !job) return;
    analyticsService.trackJobViewed(user.id, id, { source: 'job_detail' });
  }, [user?.id, id, loading, job]);

  useEffect(() => {
    if (!id || loading || !job) return;

    jobsService.getApplicationCount(id).then(({ count }) => {
      setApplicationCount(count ?? 0);
    });

    if (user?.id && !isPreviewMode) {
      applicationsService.hasApplied(user.id, id).then(({ data }) => {
        setApplication(data);
      });
    }
  }, [id, isPreviewMode, job, loading, user?.id]);

  const handleApply = () => {
    if (isPreviewMode || !user?.id) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      navigate('/login');
      return;
    }
    if (role !== ROLES.PERSONAL) {
      showToast('Solo las cuentas de candidato pueden postularse a ofertas.', 'info');
      return;
    }
    navigate(`/personal/jobs/${id}/apply`);
  };

  const handleSaveToggle = async () => {
    if (role !== ROLES.PERSONAL) {
      showToast('Solo las cuentas de candidato pueden guardar ofertas.', 'info');
      return;
    }
    const result = await toggleSavedJob(id);
    showToast(result.message, result.ok ? 'success' : 'error');
  };

  const hasActiveApplication = application && application.status !== 'withdrawn';
  const canUseCandidateActions = role === ROLES.PERSONAL;

  if (loading) {
    return (
      <FormPageLayout backButton>
        <JobDetailSkeleton />
      </FormPageLayout>
    );
  }

  if (!job) {
    return (
      <FormPageLayout backButton>
        <p className="p-space-base text-body-small text-app-muted">Empleo no encontrado.</p>
      </FormPageLayout>
    );
  }

  const requirements = parseRequirements(job.requirements);
  const benefits = parseBenefits(job.benefits);
  const locationParts = [job.city, job.work_mode ? getWorkModeLabel(job.work_mode) : null].filter(Boolean);
  const locationLine = locationParts.join(' · ');

  return (
    <FormPageLayout
      backButton
      actions={
        <ContentActionMenu
          shareUrl={generateJobUrl(id)}
          shareTitle={company?.company_name ? `${job.title} - ${company.company_name}` : job.title}
          shareText="Encontré esta oferta de empleo en TrabaGE."
          targetType={REPORT_TARGET_TYPES.JOB}
          targetId={id}
        />
      }
      footer={
        <div className="flex gap-space-sm">
          <Button
            fullWidth
            className="btn-primary-mobile !inline-flex !rounded-btn-primary !py-0"
            onClick={handleApply}
            disabled={canUseCandidateActions && hasActiveApplication}
          >
            <AppIcon icon={FileText} size={ICON_SIZES.default} className="text-white" />
            {canUseCandidateActions && hasActiveApplication ? 'Ya aplicaste' : 'Aplicar'}
          </Button>
          {canUseCandidateActions && (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              className="btn-secondary-mobile !inline-flex !rounded-btn-secondary !py-0"
              onClick={handleSaveToggle}
              loading={actionLoadingId === id}
            >
              <AppIcon icon={Bookmark} size={ICON_SIZES.default} />
              {isSaved(id) ? 'Guardado' : 'Guardar'}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-space-lg p-space-base pb-space-xl">
        <header className="space-y-space-xs">
          <h1 className="text-body font-semibold text-app-text">{job.title}</h1>
          <CompanyNameWithBadge
            company={company}
            userId={job.company_id}
            nameClassName="text-body-small text-app-muted"
            showUnverifiedLabel
          />
          <ApplicationsCounter count={applicationCount} />
        </header>

        {!isCompanyVerified(company) && (
          <Card padding="md" className="border-warning-200 bg-warning-50">
            <p className="text-body-small text-warning-800">
              Esta empresa aún no ha completado el proceso de verificación.
            </p>
          </Card>
        )}

        <section className="space-y-space-sm">
          <h2 className="text-body font-semibold text-app-text">Sobre el empleo</h2>
          <div className="space-y-space-xs">
            {locationLine ? <JobMetadataLine>{locationLine}</JobMetadataLine> : null}
            {job.job_type ? <JobMetadataLine>{getJobTypeLabel(job.job_type)}</JobMetadataLine> : null}
            <JobMetadataLine>{formatSalary(job.salary, job.salary_negotiable)}</JobMetadataLine>
            {job.created_at ? (
              <p className="flex items-center gap-space-xs text-body-small text-app-muted">
                <AppIcon icon={Clock} size={ICON_SIZES.sm} className="shrink-0" />
                Publicado <TimeAgo date={job.created_at} />
              </p>
            ) : null}
            {job.application_deadline ? (
              <JobMetadataLine>
                Fecha límite: {job.application_deadline}
              </JobMetadataLine>
            ) : null}
          </div>
        </section>

        {company?.description ? (
          <JobSection title="Sobre la empresa">
            <p className="whitespace-pre-line">{company.description}</p>
          </JobSection>
        ) : null}

        {job.role ? (
          <JobSection title="El puesto">
            <p className="whitespace-pre-line">{job.role}</p>
          </JobSection>
        ) : null}

        {job.description ? (
          <JobSection title="Descripción">
            <p className="whitespace-pre-line">{job.description}</p>
          </JobSection>
        ) : null}

        {requirements.length > 0 ? (
          <JobSection title="Requisitos">
            <JobBulletList items={requirements} />
          </JobSection>
        ) : null}

        {benefits.length > 0 ? (
          <JobSection title="Beneficios">
            <JobBulletList items={benefits} />
          </JobSection>
        ) : null}

        <SimilarJobAlertToggle
          userId={user?.id}
          job={job}
          canUseCandidateActions={canUseCandidateActions}
          showToast={showToast}
        />
      </div>
    </FormPageLayout>
  );
}
