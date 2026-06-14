import { Link, useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import ApplicationsCounter from '../../components/jobs/ApplicationsCounter';
import VerificationBadge from '../../components/company/VerificationBadge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { useJob } from '../../hooks/useJobs';
import { formatSalary } from '../../utils/formatSalary';

export default function JobDetail() {
  const { id } = useParams();
  const { job, loading } = useJob(id);
  const company = job?.company_profiles;

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
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
            <VerificationBadge status={company?.verified_status} />
          </div>
          <p className="mt-1 text-sm text-gray-600">{company?.company_name}</p>
          <p className="mt-2 text-sm text-gray-500">{formatSalary(job.salary)} · {job.city}</p>
          <ApplicationsCounter count={0} />
        </div>

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

        <Link to={`/candidate/jobs/${id}/apply`}>
          <Button fullWidth>Aplicar</Button>
        </Link>
      </div>
    </PageContainer>
  );
}
