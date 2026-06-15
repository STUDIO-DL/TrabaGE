import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import EmptyState from '../../components/common/EmptyState';
import { ApplicationListSkeleton } from '../../components/common/Skeleton';
import { NoApplications } from '../../assets/empty-states';
import CompanyNameWithBadge from '../../components/company/CompanyNameWithBadge';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { useApplications } from '../../hooks/useApplications';

export default function Applications() {
  const navigate = useNavigate();
  const { applications, loading } = useApplications();

  return (
    <PageContainer title="Mis aplicaciones">
      <div className="p-4">
        {loading ? (
          <ApplicationListSkeleton count={3} />
        ) : applications.length === 0 ? (
          <EmptyState
            image={NoApplications}
            title="No has aplicado a ninguna oferta"
            description="Aún no has enviado solicitudes. Explora ofertas y aplica a las que te interesen."
            actionLabel="Ver empleos"
            onAction={() => navigate('/candidate/jobs')}
          />
        ) : (
          applications.map((app) => (
            <Card key={app.id} className="mb-3">
              <p className="font-semibold text-gray-900">{app.jobs?.title}</p>
              <CompanyNameWithBadge
                company={app.jobs?.company_profiles}
                showUnverifiedLabel
                className="mt-0.5"
              />
              <Badge label={app.status} className="mt-2" />
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}
