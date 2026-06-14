import { supabase } from '../config/supabase';

export const adminService = {
  getAllUsers: () =>
    supabase
      .from('user_roles')
      .select('*, candidate_profiles(full_name), company_profiles(company_name)')
      .order('created_at', { ascending: false }),

  getAllJobs: () =>
    supabase
      .from('jobs')
      .select('*, company_profiles(company_name)')
      .order('created_at', { ascending: false }),

  getPendingVerifications: () =>
    supabase
      .from('verification_requests')
      .select('*, company_profiles(company_name, logo_url)')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false }),

  reviewVerification: (id, status, notes) =>
    supabase
      .from('verification_requests')
      .update({ status, notes, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single(),

  updateCompanyVerificationStatus: (companyId, verifiedStatus) =>
    supabase
      .from('company_profiles')
      .update({ verified_status: verifiedStatus })
      .eq('user_id', companyId),
};
