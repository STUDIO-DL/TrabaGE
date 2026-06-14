import { useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import JobFilters from '../../components/jobs/JobFilters';
import JobCard from '../../components/jobs/JobCard';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { useJobs } from '../../hooks/useJobs';

export default function Jobs() {
  const [filters, setFilters] = useState({});
  const { jobs, loading } = useJobs(filters);

  return (
    <PageContainer title="Empleos">
      <div className="p-4">
        <JobFilters filters={filters} onChange={setFilters} />
        {loading ? (
          <Spinner fullscreen />
        ) : jobs.length === 0 ? (
          <EmptyState
            image="/images/no-jobs.png"
            title="No hay empleos disponibles"
            description="Vuelve pronto para ver nuevas oportunidades."
          />
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>
    </PageContainer>
  );
}
