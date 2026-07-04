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

function cleanSubtitle(parts) {
  return parts.filter(Boolean).join(' • ');
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
      return { data: [], error: rpcResult.error };
    }

    return {
      data: (rpcResult.data || []).map((item) => mapGlobalSearchRow(item, user)),
      error: null,
    };
  },

  async search({ query, user }) {
    const trimmedQuery = query?.trim();

    if (!trimmedQuery) {
      return { data: [], error: null };
    }

    const globalResult = await this.globalSearch({
      query: trimmedQuery,
      limitPerType: RESULT_LIMIT,
      user,
    });

    if (!globalResult.error && globalResult.data?.length) {
      return globalResult;
    }

    const rpcResult = await supabase.rpc('search_discovery', {
      p_query: trimmedQuery,
      p_limit: RESULT_LIMIT,
    });

    if (!rpcResult.error && rpcResult.data) {
      return {
        data: rpcResult.data.map((item) => ({
          type: item.result_type,
          id: item.result_id,
          title: item.title,
          subtitle: item.subtitle,
          path:
            item.result_type === 'job'
              ? roleAwareJobPath(item.result_id, user)
              : item.path,
          avatar_path: item.avatar_path,
          rank: item.rank,
        })),
        error: null,
      };
    }

    const postsSearch = async () => {
      const ftsResult = await supabase
        .from('posts')
        .select('id, content, author_id, author_type, created_at')
        .textSearch('fts', trimmedQuery, { type: 'websearch', config: 'spanish' })
        .limit(RESULT_LIMIT);

      if (!ftsResult.error) return ftsResult;

      return supabase
        .from('posts')
        .select('id, content, author_id, author_type, created_at')
        .ilike('content', `%${trimmedQuery}%`)
        .limit(RESULT_LIMIT);
    };

    const [jobsRes, candidatesRes, companiesRes, postsRes] = await Promise.all([
      // 1. Search Jobs
      supabase
        .from('jobs')
        .select('id, title, city, created_at, company_profiles(company_name, logo_path)')
        .textSearch('fts', trimmedQuery, { type: 'websearch', config: 'spanish' })
        .eq('status', 'active')
        .eq('admin_hidden', false)
        .limit(RESULT_LIMIT),

      // 2. Search Candidates (publicly visible fields)
      supabase
        .from('candidate_profiles')
        .select('user_id, full_name, headline, city, avatar_path')
        .textSearch('fts', trimmedQuery, { type: 'websearch', config: 'spanish' })
        .eq('is_active', true)
        .limit(RESULT_LIMIT),

      // 3. Search Companies
      supabase
        .from('company_profiles')
        .select('user_id, company_name, city, logo_path, sector, company_type')
        .textSearch('fts', trimmedQuery, { type: 'websearch', config: 'spanish' })
        .eq('is_active', true)
        .limit(RESULT_LIMIT),

      postsSearch(),
    ]);

    const error = jobsRes.error || candidatesRes.error || companiesRes.error || postsRes.error;
    if (error) {
      reportError(error, { area: 'search_service_fallback', query: trimmedQuery });
      return { data: [], error };
    }

    const jobs = (jobsRes.data || []).map((item) => ({
      type: 'job',
      id: item.id,
      title: item.title,
      subtitle: cleanSubtitle([item.company_profiles?.company_name || 'Empresa', item.city]),
      path: roleAwareJobPath(item.id, user),
      avatar_path: item.company_profiles?.logo_path,
      rank: 80,
    }));

    const candidates = (candidatesRes.data || []).map((item) => {
      const isOwner = user?.role === ROLES.CANDIDATE && user?.id === item.user_id;
      return {
        type: 'candidate',
        id: item.user_id,
        title: item.full_name,
        subtitle: item.headline || item.city,
        path: isOwner ? '/candidate/profile' : `/profile/${item.user_id}`,
        avatar_path: item.avatar_path,
        rank: 70,
      };
    });

    const companies = (companiesRes.data || []).map((item) => {
      const isOwner = user?.role === ROLES.COMPANY && user?.id === item.user_id;
      return {
        type: 'company',
        id: item.user_id,
        title: item.company_name,
        subtitle: item.sector || item.company_type || item.city,
        path: isOwner ? '/company/profile' : `/companies/${item.user_id}`,
        avatar_path: item.logo_path,
        rank: 75,
      };
    });

    const posts = (postsRes.data || []).map((item) => ({
      type: 'post',
      id: item.id,
      title: item.content?.slice(0, 90) || 'Publicación',
      subtitle: item.author_type === 'company' ? 'Publicación de empresa' : 'Publicación de candidato',
      path: `/feed/post/${item.id}`,
      avatar_path: null,
      rank: 60,
    }));

    const combinedResults = [...jobs, ...companies, ...candidates, ...posts]
      .filter((item) => item.title)
      .sort((a, b) => b.rank - a.rank || String(a.title).localeCompare(String(b.title)));

    return { data: combinedResults, error: null };
  },
};