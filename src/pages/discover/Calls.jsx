import { useCallback, useEffect, useState } from 'react';
import DiscoverSectionPage from '../../components/discover/DiscoverSectionPage';
import JobCard from '../../components/jobs/JobCard';
import { Landmark } from '../../constants/icons';
import { discoverService } from '../../services/discover.service';

export default function Calls() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await discoverService.getOrganizationJobs();
    if (fetchError) setError('No se pudieron cargar las convocatorias.');
    setJobs(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DiscoverSectionPage
      title="Convocatorias"
      loading={loading}
      error={error}
      onRetry={load}
      isEmpty={!loading && !error && jobs.length === 0}
      emptyIcon={Landmark}
      emptyTitle="No hay convocatorias activas"
      emptyDescription="Las organizaciones publican convocatorias aquí cuando tienen plazas abiertas."
    >
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </DiscoverSectionPage>
  );
}
