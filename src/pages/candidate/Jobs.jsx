import { useMemo, useState } from 'react';

import PageContainer from '../../components/layout/PageContainer';

import JobsHeader from '../../components/jobs/JobsHeader';

import JobsSearchBar from '../../components/jobs/JobsSearchBar';

import JobsToolbar from '../../components/jobs/JobsToolbar';

import JobsFilterPanel from '../../components/jobs/JobsFilterPanel';

import JobsRecommendationsBanner from '../../components/jobs/JobsRecommendationsBanner';

import JobCard from '../../components/jobs/JobCard';

import EmptyState from '../../components/common/EmptyState';

import { JobListSkeleton } from '../../components/common/Skeleton';

import { NoJobs } from '../../assets/empty-states';

import { useJobs } from '../../hooks/useJobs';

import { useProfile } from '../../hooks/useProfile';

import { applyJobRecommendations } from '../../utils/jobMatching';

import { buildJobFilters, matchCityFromQuery } from '../../utils/jobFilters';

export default function Jobs() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [filters, setFilters] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();

  const effectiveFilters = useMemo(
    () => buildJobFilters(filters, query),
    [filters, query],
  );

  const { jobs, loading } = useJobs(effectiveFilters);
  const { profile } = useProfile();

  const queryFilteredJobs = normalizedQuery
    ? jobs.filter((job) => {
        const matchedCity = matchCityFromQuery(query);
        const haystack = [job.title, job.city, job.company_profiles?.company_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (matchedCity && job.city === matchedCity) return true;
        return haystack.includes(normalizedQuery);
      })
    : jobs;

  const skillNames = useMemo(
    () => (profile?.skills ?? []).map((item) => item.name).filter(Boolean),
    [profile?.skills],
  );

  const { jobs: displayJobs, mode: recommendationMode } = useMemo(
    () =>
      applyJobRecommendations(queryFilteredJobs, profile?.job_preferences, skillNames, {
        query: normalizedQuery,
        filters: effectiveFilters,
      }),
    [queryFilteredJobs, profile?.job_preferences, skillNames, normalizedQuery, effectiveFilters],
  );

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

        <JobsRecommendationsBanner mode={recommendationMode} />

        <JobsToolbar count={loading ? 0 : displayJobs.length} sort={sort} onSortChange={setSort} />

        <div className="space-y-3" aria-label="Listado de empleos">
          {loading ? (
            <JobListSkeleton count={3} />
          ) : displayJobs.length === 0 ? (
            <EmptyState
              image={NoJobs}
              title="No hay ofertas disponibles"
              description="Estamos buscando nuevas oportunidades para ti. Vuelve pronto o actualiza tus preferencias en tu perfil."
            />
          ) : (
            displayJobs.map((job, index) => <JobCard key={job.id} job={job} accentIndex={index} />)
          )}
        </div>
      </div>
    </PageContainer>
  );
}
