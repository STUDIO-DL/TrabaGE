import { useState } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import JobsHeader from '../../components/jobs/JobsHeader';
import JobsSearchBar from '../../components/jobs/JobsSearchBar';
import JobsToolbar from '../../components/jobs/JobsToolbar';
import JobsFilterPanel from '../../components/jobs/JobsFilterPanel';
import JobCard from '../../components/jobs/JobCard';
import EmptyState from '../../components/common/EmptyState';
import { JobListSkeleton } from '../../components/common/Skeleton';
import { NoJobs } from '../../assets/empty-states';
import { useJobs } from '../../hooks/useJobs';

export default function Jobs() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [filters, setFilters] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { jobs, loading } = useJobs(filters);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredJobs = normalizedQuery
    ? jobs.filter((job) => {
        const haystack = [job.title, job.city, job.company_profiles?.company_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : jobs;

  return (
    <PageContainer topBar={false} className="max-w-lg">
      <JobsHeader />

      <div className="space-y-4 px-4 pb-4 pt-4">
        <JobsSearchBar
          query={query}
          onQueryChange={setQuery}
          filtersOpen={filtersOpen}
          onFiltersToggle={() => setFiltersOpen((open) => !open)}
        />

        <JobsFilterPanel open={filtersOpen} filters={filters} onChange={setFilters} />

        <JobsToolbar count={loading ? 0 : filteredJobs.length} sort={sort} onSortChange={setSort} />

        <div className="space-y-3" aria-label="Listado de empleos">
          {loading ? (
            <JobListSkeleton count={3} />
          ) : filteredJobs.length === 0 ? (
            <EmptyState
              image={NoJobs}
              title="No hay ofertas disponibles"
              description="Estamos buscando nuevas oportunidades para ti. Vuelve pronto."
            />
          ) : (
            filteredJobs.map((job, index) => <JobCard key={job.id} job={job} accentIndex={index} />)
          )}
        </div>
      </div>
    </PageContainer>
  );
}
