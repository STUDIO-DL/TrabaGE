import { supabase } from '../config/supabase';

export const jobsService = {
  getActiveJobs: (filters = {}) => {
    let query = supabase
      .from('jobs')
      .select('*, company_profiles(company_name, logo_url, verified_status)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (filters.city) query = query.eq('city', filters.city);
    if (filters.jobType) query = query.eq('job_type', filters.jobType);

    return query;
  },

  getJobById: (id) =>
    supabase
      .from('jobs')
      .select('*, company_profiles(*)')
      .eq('id', id)
      .single(),

  getApplicationCount: (jobId) =>
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId),

  createJob: (data) => supabase.from('jobs').insert(data).select().single(),

  updateJob: (id, data) =>
    supabase.from('jobs').update(data).eq('id', id).select().single(),

  getCompanyJobs: (companyId) =>
    supabase
      .from('jobs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
};
