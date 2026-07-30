import { supabase } from '../../config/supabase';

export const adminAnalyticsService = {
  /**
   * Aggregated admin analytics for the selected period and filters.
   * All values come from SECURITY DEFINER RPC (require_admin).
   */
  getBundle: async ({
    from,
    to,
    city = null,
    sector = null,
    accountRole = null,
    jobType = null,
    workMode = null,
  }) => {
    const { data, error } = await supabase.rpc('admin_analytics_bundle', {
      p_from: from,
      p_to: to,
      p_city: city || null,
      p_sector: sector || null,
      p_account_role: accountRole || null,
      p_job_type: jobType || null,
      p_work_mode: workMode || null,
    });

    if (error) return { data: null, error };
    return { data, error: null };
  },
};
