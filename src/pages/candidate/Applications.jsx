import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import EmptyState from '../../components/common/EmptyState';
import { ApplicationListSkeleton } from '../../components/common/Skeleton';
import { NoApplications } from '../../assets/empty-states';
import CompanyNameWithBadge from '../../components/company/CompanyNameWithBadge';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useApplications } from '../../hooks/useApplications';
import { applicationsService } from '../../services/applications.service';
import { useNotificationContext } from '../../context/NotificationContext';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

const APPLICATION_STATUS_LABELS = {
  pending: 'En revisión',
  viewed: 'Vista por la empresa',
  contacted: 'Contactado',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  withdrawn: 'Retirada',
};

export default function Applications() {
  const navigate = useNavigate();
  const { showToast } = useNotificationContext();
  const { applications, loading, refetch } = useApplications();

  const handleWithdraw = async (applicationId) => {
    const confirmed = window.confirm('¿Quieres retirar esta aplicación?');
    if (!confirmed) return;

    const { error } = await applicationsService.withdraw(applicationId);
    if (error) {
      showToast(getSupabaseErrorMessage(error), 'error');
      return;
    }

    showToast('Aplicación retirada', 'success');
    refetch();
  };

  return (
    <PageContainer backButton>
      <div className="p-4">
        {loading ? (
          <ApplicationListSkeleton count={3} />
        ) : applications.length === 0 ? (
          <EmptyState
            image={NoApplications}
            title="No has aplicado a ninguna oferta"
            description="Aún no has enviado solicitudes. Explora ofertas y aplica a las que te interesen."
            actionLabel="Ver empleos"
            onAction={() => navigate('/personal/jobs')}
          />
        ) : (
          applications.map((app) => (
            <Card key={app.id} className="mb-3">
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
              {app.jobs?.city && <p className="mt-1 text-body-small text-app-muted">{app.jobs.city}</p>}
              <div className="mt-3 flex items-center justify-between gap-3">
                <Badge label={APPLICATION_STATUS_LABELS[app.status] ?? 'Estado desconocido'} />
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
