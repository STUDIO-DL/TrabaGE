import { supabase } from '../config/supabase';

export const applicationsService = {
  apply: (data) => supabase.from('applications').insert(data).select().single(),

  getCandidateApplications: (candidateId) =>
    supabase
      .from('applications')
      .select('*, jobs(title, company_profiles(company_name, is_verified, verification_status))')
      .eq('candidate_id', candidateId)
      .order('applied_at', { ascending: false }),

  getJobApplicants: (companyId) =>
    supabase
      .from('applications')
      .select('*, jobs!inner(company_id, title), candidate_profiles(full_name, avatar_url)')
      .eq('jobs.company_id', companyId)
      .order('applied_at', { ascending: false }),

  updateStatus: (id, status) =>
    supabase.from('applications').update({ status }).eq('id', id).select().single(),

  hasApplied: (candidateId, jobId) =>
    supabase
      .from('applications')
      .select('id')
      .eq('candidate_id', candidateId)
      .eq('job_id', jobId)
      .maybeSingle(),

  getCvPath: (applicationId) =>
    supabase.rpc('get_application_cv_url', { app_id: applicationId }),
};
