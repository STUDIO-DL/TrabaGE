import { supabase } from '../config/supabase';
import { reportError } from '../utils/logger';
import { ROLES, isEmployerRole, isPersonalRole, rolePath } from '../constants/roles';
import {
  rankSearchCandidatesForCompany,
  rankSearchJobsForCandidate,
} from '../utils/searchMatching';

const RESULT_LIMIT = 8;
const GLOBAL_SEARCH_LIMIT_PER_TYPE = 5;

function normalizeResultType(type) {
  if (type === 'candidate') return 'personal';
  if (type === 'company') return 'business';
  if (type === 'institution') return 'organization';
  return type;
}

function roleAwareJobPath(jobId, user) {
  return isPersonalRole(user?.role) ? `/personal/jobs/${jobId}` : `/jobs/${jobId}`;
}

function roleAwareCandidatePath(userId, user) {
  const isOwner = isPersonalRole(user?.role) && user?.id === userId;
  return isOwner ? '/personal/profile' : `/profile/${userId}`;
}

function roleAwareCompanyPath(companyId, user) {
  const isOwner = isEmployerRole(user?.role) && user?.id === companyId;
  if (!isOwner) return `/companies/${companyId}`;
  return rolePath(user.role === ROLES.ORGANIZATION ? ROLES.ORGANIZATION : ROLES.BUSINESS, '/profile');
}

function mapGlobalSearchRow(item, user) {
  const type = normalizeResultType(item.result_type);
  let path = item.path;

  if (type === 'job') {
    path = roleAwareJobPath(item.result_id, user);
  } else if (type === 'personal') {
    path = roleAwareCandidatePath(item.result_id, user);
  } else if (type === 'business' || type === 'organization') {
    path = roleAwareCompanyPath(item.result_id, user);
  }

  return {
    type,
    id: item.result_id,
    title: item.title,
    subtitle: item.subtitle,
    path,
    avatar_path: item.avatar_path,
    rank: item.rank,
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
    const trimmedQuery = query?.trim();

    if (!trimmedQuery) {
      return { data: [], error: null };
    }

    const rpcResult = await supabase.rpc('global_search', {
      p_query: trimmedQuery,
      p_limit_per_type: limitPerType,
    });

    if (rpcResult.error) {
      reportError(rpcResult.error, { area: 'global_search_rpc', query: trimmedQuery });
      return { data: [], error: null };
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

  async search({ query, user, matchingContext = null }) {
    return this.globalSearch({
      query,
      limitPerType: RESULT_LIMIT,
      user,
      matchingContext,
    });
  },
};