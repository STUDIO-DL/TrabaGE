import { supabase } from '../config/supabase';
import { ROLES } from '../constants/roles';

export const searchService = {
  async search({ query, user }) {
    const trimmedQuery = query?.trim();

    if (!trimmedQuery) {
      return { data: [], error: null };
    }

    const [jobsRes, candidatesRes, companiesRes] = await Promise.all([
      // 1. Search Jobs
      supabase
        .from('jobs')
        .select('id, title, city, company_profiles(company_name, logo_path)')
        .textSearch('fts', trimmedQuery, { type: 'websearch', config: 'spanish' })
        .eq('status', 'active')
        .eq('admin_hidden', false)
        .limit(5),

      // 2. Search Candidates (publicly visible fields)
      supabase
        .from('candidate_profiles')
        .select('user_id, full_name, headline, city, avatar_path')
        .textSearch('fts', trimmedQuery, { type: 'websearch', config: 'spanish' })
        .eq('is_active', true)
        .limit(5),

      // 3. Search Companies
      supabase
        .from('company_profiles')
        .select('user_id, company_name, city, logo_path, sector, company_type')
        .textSearch('fts', trimmedQuery, { type: 'websearch', config: 'spanish' })
        .eq('is_active', true)
        .limit(5),
    ]);

    const error = jobsRes.error || candidatesRes.error || companiesRes.error;
    if (error) {
      console.error('Search error:', error);
      return { data: [], error };
    }

    const jobs = (jobsRes.data || []).map((item) => ({
      type: 'job',
      id: item.id,
      title: item.title,
      subtitle: `${item.company_profiles?.company_name || 'Empresa'} • ${item.city || ''}`,
      path: `/candidate/jobs/${item.id}`,
      avatar_path: item.company_profiles?.logo_path,
    }));

    const candidates = (candidatesRes.data || []).map((item) => {
      const isOwner = user?.role === ROLES.CANDIDATE && user?.id === item.user_id;
      return {
        type: 'candidate',
        id: item.user_id,
        title: item.full_name,
        subtitle: item.headline || item.city,
        path: isOwner ? '/candidate/profile' : `/profiles/${item.user_id}`,
        avatar_path: item.avatar_path,
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
      };
    });

    const combinedResults = [...jobs, ...candidates, ...companies];

    return { data: combinedResults, error: null };
  },
};