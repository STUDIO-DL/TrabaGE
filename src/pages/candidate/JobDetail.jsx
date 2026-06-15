import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import ApplicationsCounter from '../../components/jobs/ApplicationsCounter';
import CompanyNameWithBadge from '../../components/company/CompanyNameWithBadge';
import Card from '../../components/ui/Card';
import { isCompanyVerified } from '../../utils/companyVerification';
import Button from '../../components/ui/Button';
import AppIcon from '../../components/common/AppIcon';
import Spinner from '../../components/ui/Spinner';
import { FileText, ICON_SIZES } from '../../constants/icons';
import { useJob } from '../../hooks/useJobs';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { formatSalary } from '../../utils/formatSalary';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isPreviewMode } = useAuth();
  const { showToast } = useNotificationContext();
  const { job, loading } = useJob(id);
  const company = job?.company_profiles;

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
    <PageContainer title="Detalle del empleo" backButton bottomNav={false}>
      <div className="space-y-4 p-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
          <CompanyNameWithBadge
            company={company}
            nameClassName="mt-1 text-sm text-gray-600"
            showUnverifiedLabel
          />
          <p className="mt-2 text-sm text-gray-500">{formatSalary(job.salary)} · {job.city}</p>
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

        {job.requirements && (
          <section>
            <h3 className="mb-2 font-semibold text-gray-900">Requisitos</h3>
            <p className="text-sm text-gray-700">{job.requirements}</p>
          </section>
        )}

        <Button fullWidth className="inline-flex items-center justify-center gap-2" onClick={handleApply}>
          <AppIcon icon={FileText} size={ICON_SIZES.default} className="text-white" />
          Aplicar
        </Button>
      </div>
    </PageContainer>
  );
}
