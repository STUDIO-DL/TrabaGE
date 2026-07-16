import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
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
import { parseBenefits, parseRequirements } from '../../utils/jobParsing';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import { useSavedJobs } from '../../hooks/useSavedJobs';
import { ROLES } from '../../constants/roles';

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
      <PageContainer backButton>
        <JobDetailSkeleton />
      </PageContainer>
    );
  }

  if (!job) {
    return (
      <PageContainer backButton>
        <p className="p-space-base text-body-small text-app-muted">Empleo no encontrado.</p>
      </PageContainer>
    );
  }

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
        <div className="flex gap-2">
          {canUseCandidateActions && (
            <Button
              type="button"
              variant="secondary"
              className="!inline-flex !rounded-btn-secondary !py-0"
              onClick={handleSaveToggle}
              loading={actionLoadingId === id}
            >
              <AppIcon icon={Bookmark} size={ICON_SIZES.default} />
              {isSaved(id) ? 'Guardado' : 'Guardar'}
            </Button>
          )}
          <Button
            fullWidth
            className="btn-primary-mobile !inline-flex !rounded-btn-primary !py-0"
            onClick={handleApply}
            disabled={canUseCandidateActions && hasActiveApplication}
          >
            <AppIcon icon={FileText} size={ICON_SIZES.default} className="text-white" />
            {canUseCandidateActions && hasActiveApplication ? 'Ya aplicaste' : 'Aplicar'}
          </Button>
        </div>
      }
    >
      <div className="space-y-space-base p-space-base pb-space-xl">
        <div>
          <h2 className="text-heading-m font-bold text-app-text">{job.title}</h2>
          <CompanyNameWithBadge
            company={company}
            userId={job.company_id}
            nameClassName="mt-space-xs text-body-small text-app-muted"
            showUnverifiedLabel
          />
          <p className="mt-space-sm text-body-small text-app-muted">
            {formatSalary(job.salary, job.salary_negotiable)}
            {job.city ? ` · ${job.city}` : ''}
            {job.work_mode ? ` · ${getWorkModeLabel(job.work_mode)}` : ''}
          </p>
          <ApplicationsCounter count={applicationCount} />
          {job.created_at && (
            <p className="mt-space-sm flex items-center gap-space-xs text-caption text-app-subtle">
              <AppIcon icon={Clock} size={ICON_SIZES.sm} className="shrink-0" />
              <TimeAgo date={job.created_at} />
            </p>
          )}
        </div>

        {!isCompanyVerified(company) && (
          <Card padding="md" className="border-warning-200 bg-warning-50">
            <p className="text-body-small text-warning-800">
              Esta empresa aún no ha completado el proceso de verificación.
            </p>
          </Card>
        )}

        {job.description && (
          <section>
            <h3 className="mb-space-sm text-button font-semibold text-app-text">Descripción</h3>
            <p className="text-body-small text-app-text">{job.description}</p>
          </section>
        )}

        {parseRequirements(job.requirements).length > 0 && (
          <section>
            <h3 className="mb-space-sm text-button font-semibold text-app-text">Requisitos</h3>
            <ul className="list-inside list-disc space-y-space-xs text-body-small text-app-text">
              {parseRequirements(job.requirements).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {parseBenefits(job.benefits).length > 0 && (
          <section>
            <h3 className="mb-space-sm text-button font-semibold text-app-text">Beneficios</h3>
            <ul className="list-inside list-disc space-y-space-xs text-body-small text-app-text">
              {parseBenefits(job.benefits).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {job.application_deadline && (
          <section>
            <h3 className="mb-space-sm text-button font-semibold text-app-text">Fecha límite</h3>
            <p className="text-body-small text-app-text">{job.application_deadline}</p>
          </section>
        )}

      </div>
    </FormPageLayout>
  );
}
