import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import EmptyState from '../../components/common/EmptyState';
import { ApplicationListSkeleton } from '../../components/common/Skeleton';
import { FileText } from '../../constants/icons';
import CompanyNameWithBadge from '../../components/company/CompanyNameWithBadge';
import ApplicationStatusBadge from '../../components/apply/ApplicationStatusBadge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useApplications } from '../../hooks/useApplications';
import { applicationsService } from '../../services/applications.service';
import { useNotificationContext } from '../../context/NotificationContext';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

export default function Applications() {
  const navigate = useNavigate();
  const { showToast } = useNotificationContext();
  const { applications, loading, refetch } = useApplications();

  const handleWithdraw = async (applicationId) => {
    const confirmed = window.confirm('¿Quieres retirar esta solicitud?');
    if (!confirmed) return;

    const { error } = await applicationsService.withdraw(applicationId);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }

    showToast('Solicitud retirada', 'success');
    refetch();
  };

  return (
    <PageContainer backButton>
      <div className="p-space-base">
        {loading ? (
          <ApplicationListSkeleton count={3} />
        ) : applications.length === 0 ? (
          <EmptyState
            variant="soft"
            icon={FileText}
            title="No has aplicado a ninguna oferta"
            description="Explora ofertas y aplica a las que te interesen."
            actionLabel="Ver empleos"
            onAction={() => navigate('/personal/jobs')}
          />
        ) : (
          applications.map((app) => (
            <Card key={app.id} className="mb-space-md">
              <button
                type="button"
                onClick={() => app.jobs?.id && navigate(`/personal/jobs/${app.jobs.id}`)}
                className="text-left font-semibold text-app-text transition-colors duration-fast hover:text-primary-700"
              >
                {app.jobs?.title || 'Oferta no disponible'}
              </button>
              <CompanyNameWithBadge
                company={app.jobs?.company_profiles}
                showUnverifiedLabel
                className="mt-0.5"
              />
              {app.jobs?.city && (
                <p className="mt-space-xs text-body-small text-app-muted">{app.jobs.city}</p>
              )}
              <div className="mt-space-md flex items-center justify-between gap-space-md">
                <ApplicationStatusBadge status={app.status} />
                {!['withdrawn', 'rejected', 'accepted'].includes(app.status) && (
                  <Button size="sm" variant="ghost" onClick={() => handleWithdraw(app.id)}>
                    Retirar
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}
