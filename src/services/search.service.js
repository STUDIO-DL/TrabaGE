import { supabase } from '../config/supabase';
import { reportError } from '../utils/logger';
import { ROLES } from '../constants/roles';

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
  async globalSearch({ query, limitPerType = GLOBAL_SEARCH_LIMIT_PER_TYPE, user }) {
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

    return {
      data: (rpcResult.data || []).map((item) => mapGlobalSearchRow(item, user)),
      error: null,
    };
  },

  async search({ query, user }) {
    return this.globalSearch({
      query,
      limitPerType: RESULT_LIMIT,
      user,
    });
  },
};