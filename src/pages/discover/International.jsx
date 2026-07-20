import { useCallback, useEffect, useState } from 'react';
import DiscoverSectionPage from '../../components/discover/DiscoverSectionPage';
import JobCard from '../../components/jobs/JobCard';
import { Globe } from '../../constants/icons';
import { discoverService } from '../../services/discover.service';

export default function International() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await discoverService.getInternationalJobs();
    if (fetchError) setError('No se pudieron cargar las oportunidades.');
    setJobs(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DiscoverSectionPage
      title="Oportunidades internacionales"
      loading={loading}
      error={error}
      onRetry={load}
      isEmpty={!loading && !error && jobs.length === 0}
      emptyIcon={Globe}
      emptyTitle="No hay oportunidades internacionales"
      emptyDescription="Empleo remoto y vacantes en el extranjero aparecerán aquí cuando estén disponibles."
    >
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </DiscoverSectionPage>
  );
}
