import { useEffect } from 'react';
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
import Spinner from '../../components/ui/Spinner';
import { FileText, ICON_SIZES } from '../../constants/icons';
import { REPORT_TARGET_TYPES } from '../../constants/reportReasons';
import { generateJobUrl } from '../../utils/generateShareUrl';
import { useJob } from '../../hooks/useJobs';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { analyticsService } from '../../services/analytics.service';
import { formatSalary } from '../../utils/formatSalary';
import { getWorkModeLabel } from '../../constants/workModes';
import { parseBenefits, parseRequirements } from '../../utils/jobParsing';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isPreviewMode, user } = useAuth();
  const { showToast } = useNotificationContext();
  const { job, loading } = useJob(id);
  const company = job?.company_profiles;

  useEffect(() => {
    if (!user?.id || !id || loading || !job) return;
    analyticsService.trackJobViewed(user.id, id, { source: 'job_detail' });
  }, [user?.id, id, loading, job]);

  const handleApply = () => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      navigate('/login');
      return;
    }
    navigate(`/candidate/jobs/${id}/apply`);
  };

  if (loading) {
    return (
      <PageContainer title="Detalle" backButton>
        <Spinner fullscreen />
      </PageContainer>
    );
  }

  if (!job) {
    return (
      <PageContainer title="Detalle" backButton>
        <p className="p-4 text-sm text-gray-500">Empleo no encontrado.</p>
      </PageContainer>
    );
  }

  return (
    <FormPageLayout
      title="Detalle del empleo"
      backButton
      actions={
        <ContentActionMenu
          shareUrl={generateJobUrl(id)}
          shareTitle={job.title}
          targetType={REPORT_TARGET_TYPES.JOB}
          targetId={id}
        />
      }
      footer={
        <Button fullWidth className="btn-primary-mobile !inline-flex !rounded-btn-primary !py-0" onClick={handleApply}>
          <AppIcon icon={FileText} size={ICON_SIZES.default} className="text-white" />
          Aplicar
        </Button>
      }
    >
      <div className="space-y-md p-md pb-lg">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
          <CompanyNameWithBadge
            company={company}
            nameClassName="mt-1 text-sm text-gray-600"
            showUnverifiedLabel
          />
          <p className="mt-2 text-sm text-gray-500">
            {formatSalary(job.salary, job.salary_negotiable)}
            {job.city ? ` · ${job.city}` : ''}
            {job.work_mode ? ` · ${getWorkModeLabel(job.work_mode)}` : ''}
          </p>
          <ApplicationsCounter count={0} />
        </div>

        {!isCompanyVerified(company) && (
          <Card padding="md" className="border-amber-200 bg-amber-50">
            <p className="text-sm text-amber-800">
              Esta empresa aún no ha completado el proceso de verificación.
            </p>
          </Card>
        )}

        {job.description && (
          <section>
            <h3 className="mb-2 font-semibold text-gray-900">Descripción</h3>
            <p className="text-sm text-gray-700">{job.description}</p>
          </section>
        )}

        {parseRequirements(job.requirements).length > 0 && (
          <section>
            <h3 className="mb-2 font-semibold text-gray-900">Requisitos</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
              {parseRequirements(job.requirements).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {parseBenefits(job.benefits).length > 0 && (
          <section>
            <h3 className="mb-2 font-semibold text-gray-900">Beneficios</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
              {parseBenefits(job.benefits).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {job.application_deadline && (
          <section>
            <h3 className="mb-2 font-semibold text-gray-900">Fecha límite</h3>
            <p className="text-sm text-gray-700">{job.application_deadline}</p>
          </section>
        )}

      </div>
    </FormPageLayout>
  );
}
