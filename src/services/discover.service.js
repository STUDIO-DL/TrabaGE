import { supabase } from '../config/supabase';

async function countActiveJobs(filters = {}) {
  let query = supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  if (filters.jobType) query = query.eq('job_type', filters.jobType);
  if (filters.international) {
    query = query.or('country.neq.Guinea Ecuatorial,work_mode.eq.remote');
  }

  const { count, error } = await query;
  return { count: count ?? 0, error };
}

async function countScholarships() {
  const { count, error } = await supabase
    .from('feed_courses')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('category', 'scholarship');
  return { count: count ?? 0, error };
}

async function countCourses() {
  const { count, error } = await supabase
    .from('feed_courses')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .neq('category', 'scholarship');
  return { count: count ?? 0, error };
}

async function countEvents() {
  const { count, error } = await supabase
    .from('feed_events')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .gte('starts_at', new Date(Date.now() - 7 * 86400000).toISOString());
  return { count: count ?? 0, error };
}

async function countStartups() {
  const { count, error } = await supabase
    .from('company_profiles')
    .select('user_id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('company_type', 'Startup');
  return { count: count ?? 0, error };
}

async function countNewCompanies() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { count, error } = await supabase
    .from('company_profiles')
    .select('user_id', { count: 'exact', head: true })
    .eq('is_active', true)
    .gte('created_at', thirtyDaysAgo);
  return { count: count ?? 0, error };
}

async function countOrganizationJobs() {
  const orgRoles = await supabase.from('user_roles').select('user_id').eq('role', 'organization');
  const orgIds = (orgRoles.data ?? []).map((row) => row.user_id);
  if (!orgIds.length) return { count: 0, error: orgRoles.error };

  const { count, error } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .in('company_id', orgIds);
  return { count: count ?? 0, error };
}

export const discoverService = {
  getHubSummary: async () => {
    const [
      internships,
      scholarships,
      courses,
      events,
      startups,
      newCompanies,
      international,
      calls,
    ] = await Promise.all([
      countActiveJobs({ jobType: 'internship' }),
      countScholarships(),
      countCourses(),
      countEvents(),
      countStartups(),
      countNewCompanies(),
      countActiveJobs({ international: true }),
      countOrganizationJobs(),
    ]);

    return {
      counts: {
        internships: internships.count,
        scholarships: scholarships.count,
        courses: courses.count,
        events: events.count,
        entrepreneurs: startups.count,
        'new-companies': newCompanies.count,
        international: international.count,
        calls: calls.count,
        volunteering: 0,
      },
      error:
        internships.error ||
        scholarships.error ||
        courses.error ||
        events.error ||
        startups.error ||
        newCompanies.error ||
        international.error ||
        calls.error ||
        null,
    };
  },

  getHiringCompaniesPreview: async (limit = 6) => {
    const { data, error } = await supabase.rpc('get_companies_hiring', {
      p_limit: limit,
      p_offset: 0,
    });
    if (!error) return { data: data ?? [], error: null };
    return discoverService.getHiringCompaniesFallback(limit);
  },

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

  getNewCompanies: async ({ limit = 30, offset = 0 } = {}) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data, error } = await supabase
      .from('company_profiles')
      .select('user_id, company_name, logo_path, sector, city, company_type, intro, created_at')
      .eq('is_active', true)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return { data: data ?? [], error };
  },
};
