import { supabase } from '../config/supabase';
import { verificationService } from './verification.service';

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

  getPendingVerifications: () => verificationService.getPendingRequests(),

  reviewVerification: (id, action, reviewNotes) =>
    verificationService.reviewRequest(id, action, reviewNotes),

  getVerificationDocumentUrl: (documentPath) =>
    verificationService.getSignedDocumentUrl(documentPath),
};
