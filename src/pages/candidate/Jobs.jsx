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
import { applicationsService } from '../../services/applications.service';
import { useSavedJobs } from '../../hooks/useSavedJobs';
import { useNotificationContext } from '../../context/NotificationContext';
import { FOLLOWS_TARGET, followsService } from '../../services/follows.service';

function extractSalary(value) {
  const numbers = String(value ?? '')
    .match(/\d[\d.,]*/g)
    ?.map((item) => Number(item.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')))
    .filter((item) => Number.isFinite(item));
  return numbers?.length ? Math.max(...numbers) : 0;
}

function sortJobs(jobs, sort, scoreByJobId = {}) {
  const list = [...jobs];
  if (sort === 'salary_desc') {
    return list.sort((a, b) => extractSalary(b.salary) - extractSalary(a.salary));
  }
  if (sort === 'salary_asc') {
    return list.sort((a, b) => extractSalary(a.salary) - extractSalary(b.salary));
  }
  if (sort === 'match') {
    return list.sort(
      (a, b) =>
        (scoreByJobId[b.id] ?? 0) - (scoreByJobId[a.id] ?? 0) ||
        new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0),
    );
  }
  if (sort === 'title') {
    return list.sort((a, b) => String(a.title ?? '').localeCompare(String(b.title ?? '')));
  }
  return list.sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0));
}

export default function Jobs() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('match');
  const [filters, setFilters] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [followedCompanyIds, setFollowedCompanyIds] = useState([]);
  const [applicationHistory, setApplicationHistory] = useState([]);

  const { user } = useAuth();
  const normalizedQuery = query.trim().toLowerCase();
  const showRecommendations = Boolean(user) && sort === 'match';

  const effectiveFilters = useMemo(
    () => buildJobFilters(filters, query),
    [filters, query],
  );

  const { jobs, loading } = useJobs(effectiveFilters);
  const { profile } = useProfile();
  const { showToast } = useNotificationContext();
  const { isSaved, toggleSavedJob, actionLoadingId } = useSavedJobs();

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
      education: profile?.education ?? [],
      languages: profile?.languages ?? [],
      followed_company_ids: followedCompanyIds,
      application_history: applicationHistory,
      years_experience: profile?.years_experience,
      headline: profile?.headline,
      about: profile?.about,
    }),
    [applicationHistory, followedCompanyIds, profile],
  );

  const { jobs: recommendedDisplayJobs, mode: recommendationMode, scoredJobs } = useMemo(
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

  const displayJobs = useMemo(
    () => sortJobs(recommendedDisplayJobs, sort, scoreByJobId),
    [recommendedDisplayJobs, scoreByJobId, sort],
  );

  const recommendedJobs = useMemo(
    () => scoredJobs.filter(({ score }) => score > 0),
    [scoredJobs],
  );

  const otherJobs = useMemo(() => {
    if (!showRecommendations || recommendationMode !== 'recommended') return displayJobs;
    const recommendedIds = new Set(recommendedJobs.map(({ job }) => job.id));
    return sortJobs(displayJobs.filter((job) => !recommendedIds.has(job.id)), sort, scoreByJobId);
  }, [displayJobs, recommendationMode, recommendedJobs, scoreByJobId, showRecommendations, sort]);

  const handleSaveToggle = async (jobId) => {
    const result = await toggleSavedJob(jobId);
    showToast(result.message, result.ok ? 'success' : 'error');
  };

  useEffect(() => {
    if (!user?.id) return;

    followsService.getFollowing(user.id, FOLLOWS_TARGET.COMPANY).then(({ data }) => {
      setFollowedCompanyIds((data ?? []).map((row) => row.target_id));
    });

    applicationsService.getCandidateApplications(user.id).then(({ data }) => {
      setApplicationHistory(data ?? []);
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !profile || loading || !scoredJobs.length) return;
    jobMatchesService.cacheUserJobScores(
      user.id,
      scoredJobs.map(({ job }) => job),
      userProfile,
    );
  }, [user?.id, profile, loading, scoredJobs, userProfile]);

  const showRecommendedSection =
    showRecommendations && recommendationMode === 'recommended' && recommendedJobs.length > 0;

  const listJobs =
    showRecommendations && recommendationMode === 'recommended' ? otherJobs : displayJobs;

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

        {showRecommendations && (
          <JobsRecommendationsBanner mode={recommendationMode} count={recommendedJobs.length} />
        )}

        {showRecommendedSection && (
          <section aria-label="Recomendado para ti" className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">Recomendado para ti</h2>
            {recommendedJobs.map(({ job }) => (
              <JobCard
                key={job.id}
                job={job}
                saved={isSaved(job.id)}
                saving={actionLoadingId === job.id}
                onSaveToggle={() => handleSaveToggle(job.id)}
              />
            ))}
          </section>
        )}

        {showRecommendedSection && otherJobs.length > 0 && (
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
          ) : (
            listJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                saved={isSaved(job.id)}
                saving={actionLoadingId === job.id}
                onSaveToggle={() => handleSaveToggle(job.id)}
              />
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
}
