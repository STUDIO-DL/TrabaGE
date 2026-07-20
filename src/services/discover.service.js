import { supabase } from '../config/supabase';

export const discoverService = {
  getHiringCompanies: async ({ limit = 30, offset = 0 } = {}) => {
    const { data, error } = await supabase.rpc('get_companies_hiring', {
      p_limit: limit,
      p_offset: offset,
    });
    if (!error) return { data: data ?? [], error: null };
    return discoverService.getHiringCompaniesFallback(limit, offset);
  },

  getHiringCompaniesFallback: async (limit = 30, offset = 0) => {
    const { data, error } = await supabase
      .from('jobs')
      .select('company_id, company_profiles!inner(user_id, company_name, logo_path, sector, city)')
      .eq('status', 'active');

    if (error) return { data: [], error };

    const grouped = new Map();
    (data ?? []).forEach((row) => {
      const company = row.company_profiles;
      const id = row.company_id ?? company?.user_id;
      if (!id) return;
      const current = grouped.get(id) ?? {
        company_id: id,
        company_name: company.company_name,
        logo_path: company.logo_path,
        sector: company.sector,
        city: company.city,
        active_jobs_count: 0,
      };
      current.active_jobs_count += 1;
      grouped.set(id, current);
    });

    const list = [...grouped.values()]
      .sort((a, b) => b.active_jobs_count - a.active_jobs_count || a.company_name.localeCompare(b.company_name))
      .slice(offset, offset + limit);

    return { data: list, error: null };
  },

  getScholarships: async ({ limit = 30, offset = 0 } = {}) => {
    const { data, error } = await supabase
      .from('feed_courses')
      .select('*')
      .eq('is_active', true)
      .eq('category', 'scholarship')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return { data: data ?? [], error };
  },

  getCourses: async ({ limit = 30, offset = 0 } = {}) => {
    const { data, error } = await supabase
      .from('feed_courses')
      .select('*')
      .eq('is_active', true)
      .neq('category', 'scholarship')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return { data: data ?? [], error };
  },

  getEvents: async ({ limit = 30, offset = 0 } = {}) => {
    const { data, error } = await supabase
      .from('feed_events')
      .select('*')
      .eq('is_active', true)
      .gte('starts_at', new Date(Date.now() - 7 * 86400000).toISOString())
      .order('starts_at', { ascending: true })
      .range(offset, offset + limit - 1);
    return { data: data ?? [], error };
  },

  getInternshipJobs: async ({ limit = 30, offset = 0 } = {}) => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, company_profiles!inner(company_name, logo_path, sector, country)')
      .eq('status', 'active')
      .eq('job_type', 'internship')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return { data: data ?? [], error };
  },

  getOrganizationJobs: async ({ limit = 30, offset = 0 } = {}) => {
    const orgRoles = await supabase.from('user_roles').select('user_id').eq('role', 'organization');
    const orgIds = (orgRoles.data ?? []).map((row) => row.user_id);
    if (!orgIds.length) return { data: [], error: orgRoles.error };

    const { data, error } = await supabase
      .from('jobs')
      .select('*, company_profiles!inner(company_name, logo_path, sector, country, company_type)')
      .eq('status', 'active')
      .in('company_id', orgIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return { data: data ?? [], error };
  },

  getInternationalJobs: async ({ limit = 30, offset = 0 } = {}) => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, company_profiles!inner(company_name, logo_path, sector, country)')
      .eq('status', 'active')
      .or('country.neq.Guinea Ecuatorial,work_mode.eq.remote')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return { data: data ?? [], error };
  },

  getStartups: async ({ limit = 30, offset = 0 } = {}) => {
    const { data, error } = await supabase
      .from('company_profiles')
      .select('user_id, company_name, logo_path, sector, city, company_type, intro')
      .eq('is_active', true)
      .eq('company_type', 'Startup')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return { data: data ?? [], error };
  },

};
