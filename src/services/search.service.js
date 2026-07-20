import { supabase } from '../config/supabase';
import { reportError } from '../utils/logger';
import {
  normalizeSearchEntityType,
  resolveSearchResultPath,
} from '../utils/profileRoutes';
import {
  rankSearchCandidatesForCompany,
  rankSearchJobsForCandidate,
} from '../utils/searchMatching';
import { resolveSearchResultDisplay } from '../utils/globalSearch';
import { normalizeSearchUsernameQuery } from '../utils/username';

const RESULT_LIMIT = 8;
const GLOBAL_SEARCH_LIMIT_PER_TYPE = 5;

function isOwnSearchResult(type, resultId, user) {
  if (!user?.id || !resultId) return false;
  // Profile result_id is always the auth user id for personal/business/organization.
  if (type !== 'personal' && type !== 'business' && type !== 'organization') return false;
  return String(user.id).toLowerCase() === String(resultId).toLowerCase();
}
function mapGlobalSearchRow(item, user) {
  const type = normalizeSearchEntityType(item.result_type);
  const path = resolveSearchResultPath(
    { type, id: item.result_id, result_type: item.result_type, result_id: item.result_id },
    user,
  );
  const mapped = {
    type,
    id: item.result_id,
    title: item.title,
    subtitle: item.subtitle,
    path,
    avatar_path: item.avatar_path,
    rank: item.rank,
    isSelf: isOwnSearchResult(type, item.result_id, user),
  };
  const { secondary, location } = resolveSearchResultDisplay(mapped);

  return {
    ...mapped,
    secondary,
    location,
  };
}

export const searchService = {
  // The Home/global search is a people-and-organizations search only. Job
  // offers are excluded by default (`includeJobs: false`) so the Empleos
  // section stays the single place to search and explore vacancies.
  async globalSearch({
    query,
    limitPerType = GLOBAL_SEARCH_LIMIT_PER_TYPE,
    user,
    matchingContext = null,
    includeJobs = false,
  }) {
    const trimmedQuery = normalizeSearchUsernameQuery(query?.trim() || '');

    if (!trimmedQuery) {
      return { data: [], error: null };
    }

    const rpcResult = await supabase.rpc('global_search', {
      p_query: trimmedQuery,
      p_limit_per_type: limitPerType,
    });

    if (rpcResult.error) {
      reportError(rpcResult.error, { area: 'global_search_rpc', query: trimmedQuery });
      return { data: [], error: rpcResult.error };
    }

    let data = (rpcResult.data || [])
      .map((item) => mapGlobalSearchRow(item, user))
      .filter((item) => includeJobs || item.type !== 'job');

    if (matchingContext?.userProfile) {
      const jobIds = data.filter((item) => item.type === 'job').map((item) => item.id);
      if (jobIds.length) {
        const { data: jobs } = await supabase
          .from('jobs')
          .select('*, company_profiles(sector, country)')
          .in('id', jobIds);

        const jobsById = new Map((jobs ?? []).map((job) => [job.id, job]));
        data = rankSearchJobsForCandidate(data, jobsById, matchingContext.userProfile);
      }
    } else if (matchingContext?.companyJobs?.length) {
      const candidateIds = data.filter((item) => item.type === 'personal').map((item) => item.id);
      if (candidateIds.length) {
        const [
          { data: candidates },
          { data: skills },
          { data: experience },
          { data: education },
          { data: languages },
          { data: certifications },
          { data: candidateLinks },
        ] = await Promise.all([
          supabase
            .from('candidate_profiles_public')
            .select('user_id, full_name, headline, about, city, province, country, years_experience')
            .in('user_id', candidateIds),
          supabase.from('skills').select('user_id, name').in('user_id', candidateIds),
          supabase
            .from('experience')
            .select('user_id, position, company, description, start_date, end_date')
            .in('user_id', candidateIds),
          supabase
            .from('education')
            .select('user_id, institution, program, specialty, grade')
            .in('user_id', candidateIds),
          supabase.from('languages').select('user_id, language, level').in('user_id', candidateIds),
          supabase.from('certifications').select('user_id, id').in('user_id', candidateIds),
          supabase.from('candidate_links').select('user_id, id').in('user_id', candidateIds),
        ]);

        const groupByUser = (rows, mapFn) => {
          const map = new Map();
          (rows ?? []).forEach((row) => {
            const list = map.get(row.user_id) ?? [];
            list.push(mapFn ? mapFn(row) : row);
            map.set(row.user_id, list);
          });
          return map;
        };

        const skillsByUser = groupByUser(skills, (row) => ({ name: row.name }));
        const experienceByUser = groupByUser(experience);
        const educationByUser = groupByUser(education);
        const languagesByUser = groupByUser(languages);
        const certificationsByUser = groupByUser(certifications, (row) => ({ id: row.id }));
        const linksByUser = groupByUser(candidateLinks, (row) => ({ id: row.id }));

        const candidatesById = new Map(
          (candidates ?? []).map((row) => [
            row.user_id,
            {
              ...row,
              skills: skillsByUser.get(row.user_id) ?? [],
              experience: experienceByUser.get(row.user_id) ?? [],
              education: educationByUser.get(row.user_id) ?? [],
              languages: languagesByUser.get(row.user_id) ?? [],
              certifications: certificationsByUser.get(row.user_id) ?? [],
              candidate_links: linksByUser.get(row.user_id) ?? [],
            },
          ]),
        );
        data = rankSearchCandidatesForCompany(data, candidatesById, matchingContext.companyJobs);
      }
    }

    return {
      data,
      error: null,
    };
  },

  async search({ query, user, matchingContext = null, includeJobs = true }) {
    return this.globalSearch({
      query,
      limitPerType: RESULT_LIMIT,
      user,
      matchingContext,
      includeJobs,
    });
  },
};
