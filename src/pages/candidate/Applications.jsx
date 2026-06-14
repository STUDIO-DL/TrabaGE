import PageContainer from '../../components/layout/PageContainer';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { useApplications } from '../../hooks/useApplications';

export default function Applications() {
  const { applications, loading } = useApplications();

  return (
    <PageContainer title="Mis aplicaciones">
      <div className="p-4">
        {loading ? (
          <Spinner fullscreen />
        ) : applications.length === 0 ? (
          <EmptyState
            image="/images/no-applications.png"
            title="Sin aplicaciones"
            description="Cuando apliques a un empleo, aparecerá aquí."
          />
        ) : (
          applications.map((app) => (
            <Card key={app.id} className="mb-3">
              <p className="font-semibold text-gray-900">{app.jobs?.title}</p>
              <p className="text-sm text-gray-500">{app.jobs?.company_profiles?.company_name}</p>
              <Badge label={app.status} className="mt-2" />
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}
