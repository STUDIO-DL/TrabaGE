import { supabase } from '../config/supabase';
import { reportError } from '../utils/logger';
import { ROLES } from '../constants/roles';
import {
  rankSearchCandidatesForCompany,
  rankSearchJobsForCandidate,
} from '../utils/searchMatching';

const RESULT_LIMIT = 8;
const GLOBAL_SEARCH_LIMIT_PER_TYPE = 5;

function roleAwareJobPath(jobId, user) {
  return user?.role === ROLES.CANDIDATE ? `/candidate/jobs/${jobId}` : `/jobs/${jobId}`;
}

function roleAwareCandidatePath(userId, user) {
  const isOwner = user?.role === ROLES.CANDIDATE && user?.id === userId;
  return isOwner ? '/candidate/profile' : `/profile/${userId}`;
}

function roleAwareCompanyPath(companyId, user) {
  const isOwner = user?.role === ROLES.COMPANY && user?.id === companyId;
  return isOwner ? '/company/profile' : `/companies/${companyId}`;
}

function mapGlobalSearchRow(item, user) {
  const type = item.result_type;
  let path = item.path;

  if (type === 'job') {
    path = roleAwareJobPath(item.result_id, user);
  } else if (type === 'candidate') {
    path = roleAwareCandidatePath(item.result_id, user);
  } else if (type === 'company' || type === 'institution') {
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
  async globalSearch({
    query,
    limitPerType = GLOBAL_SEARCH_LIMIT_PER_TYPE,
    user,
    matchingContext = null,
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

    let data = (rpcResult.data || []).map((item) => mapGlobalSearchRow(item, user));

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
      const candidateIds = data.filter((item) => item.type === 'candidate').map((item) => item.id);
      if (candidateIds.length) {
        const { data: candidates } = await supabase
          .from('candidate_profiles')
          .select('user_id, full_name, headline, about, city, province, country, years_experience, expected_salary, job_preferences, skills(name), experience(position, company, description, start_date, end_date), education(institution, program, specialty, grade), languages(language, level), certifications(id), candidate_links(id)')
          .in('user_id', candidateIds);

        const candidatesById = new Map((candidates ?? []).map((row) => [row.user_id, row]));
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