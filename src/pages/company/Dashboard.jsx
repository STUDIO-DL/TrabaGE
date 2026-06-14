import { Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useApplications } from '../../hooks/useApplications';
import { usePosts } from '../../hooks/usePosts';
import { jobsService } from '../../services/jobs.service';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const { user } = useAuth();
  const { applications } = useApplications();
  const { posts } = usePosts(user?.id);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    jobsService.getCompanyJobs(user.id).then(({ data }) => setJobs(data ?? []));
  }, [user?.id]);

  const activeJobs = jobs.filter((j) => j.status === 'active').length;

  return (
    <PageContainer title="Dashboard">
      <div className="grid grid-cols-3 gap-3 p-4">
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-primary-600">{activeJobs}</p>
          <p className="text-xs text-gray-500">Empleos activos</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-primary-600">{applications.length}</p>
          <p className="text-xs text-gray-500">Aplicaciones</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-2xl font-bold text-primary-600">{posts.length}</p>
          <p className="text-xs text-gray-500">Publicaciones</p>
        </Card>
      </div>

      <div className="space-y-3 px-4 pb-4">
        <Link to="/company/applicants">
          <Button variant="secondary" fullWidth>
            Ver candidatos
          </Button>
        </Link>
        <Link to="/company/publish-job">
          <Button fullWidth>
            Publicar empleo
          </Button>
        </Link>
      </div>
    </PageContainer>
  );
}
