import { supabase } from '../config/supabase';

export const reportsService = {
  submit: async ({ targetType, targetId, reasonCode, reasonDetails }) => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: authError ?? new Error('No autenticado') };
    }

    return supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason_code: reasonCode,
        reason_details: reasonDetails?.trim() || null,
      })
      .select()
      .single();
  },
};
