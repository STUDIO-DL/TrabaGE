import { useCallback, useEffect, useState } from 'react';
import DiscoverSectionPage from '../../components/discover/DiscoverSectionPage';
import JobCard from '../../components/jobs/JobCard';
import { Briefcase } from '../../constants/icons';
import { discoverService } from '../../services/discover.service';

export default function Internships() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await discoverService.getInternshipJobs();
    if (fetchError) setError('No se pudieron cargar las prácticas.');
    setJobs(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DiscoverSectionPage
      title="Prácticas"
      loading={loading}
      error={error}
      onRetry={load}
      isEmpty={!loading && !error && jobs.length === 0}
      emptyIcon={Briefcase}
      emptyTitle="No hay prácticas publicadas"
      emptyDescription="Las empresas publican prácticas en Empleos. Vuelve pronto para ver nuevas oportunidades."
    >
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </DiscoverSectionPage>
  );
}
