import { useMemo, useState, useEffect } from 'react';

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

import { useAuth } from '../../hooks/useAuth';

import { applyJobRecommendations } from '../../utils/jobMatching';

import { buildJobFilters, matchCityFromQuery } from '../../utils/jobFilters';

import { jobMatchesService } from '../../services/jobMatches.service';

export default function Jobs() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [filters, setFilters] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { user } = useAuth();
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

  const userProfile = useMemo(
    () => ({
      ...profile,
      job_preferences: profile?.job_preferences,
      skills: profile?.skills ?? [],
      experience: profile?.experience ?? [],
      years_experience: profile?.years_experience,
      headline: profile?.headline,
      about: profile?.about,
    }),
    [profile],
  );

  const { jobs: displayJobs, mode: recommendationMode, scoredJobs } = useMemo(
    () =>
      applyJobRecommendations(queryFilteredJobs, profile?.job_preferences, [], {
        query: normalizedQuery,
        filters: effectiveFilters,
        userProfile,
      }),
    [queryFilteredJobs, profile?.job_preferences, normalizedQuery, effectiveFilters, userProfile],
  );

  const scoreByJobId = useMemo(
    () => Object.fromEntries(scoredJobs.map(({ job, score }) => [job.id, score])),
    [scoredJobs],
  );

  const recommendedJobs = useMemo(
    () => scoredJobs.filter(({ score }) => score > 0),
    [scoredJobs],
  );

  const otherJobs = useMemo(() => {
    if (recommendationMode !== 'recommended') return displayJobs;
    const recommendedIds = new Set(recommendedJobs.map(({ job }) => job.id));
    return displayJobs.filter((job) => !recommendedIds.has(job.id));
  }, [displayJobs, recommendationMode, recommendedJobs]);

  useEffect(() => {
    if (!user?.id || !profile || loading || !scoredJobs.length) return;
    jobMatchesService.cacheUserJobScores(
      user.id,
      scoredJobs.map(({ job }) => job),
      userProfile,
    );
  }, [user?.id, profile, loading, scoredJobs, userProfile]);

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

        <JobsRecommendationsBanner mode={recommendationMode} count={recommendedJobs.length} />

        {recommendationMode === 'recommended' && recommendedJobs.length > 0 && (
          <section aria-label="Recomendado para ti" className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">Recomendado para ti</h2>
            {recommendedJobs.map(({ job, score }, index) => (
              <JobCard
                key={job.id}
                job={job}
                accentIndex={index}
                matchScore={score}
              />
            ))}
          </section>
        )}

        {recommendationMode === 'recommended' && otherJobs.length > 0 && (
          <h2 className="text-base font-bold text-gray-900">Más ofertas</h2>
        )}

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
          ) : recommendationMode === 'recommended' ? (
            otherJobs.map((job, index) => (
              <JobCard
                key={job.id}
                job={job}
                accentIndex={index}
                matchScore={scoreByJobId[job.id]}
              />
            ))
          ) : (
            displayJobs.map((job, index) => (
              <JobCard
                key={job.id}
                job={job}
                accentIndex={index}
                matchScore={scoreByJobId[job.id]}
              />
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
}
