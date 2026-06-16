import { supabase } from '../config/supabase';
import { submitToFormspree } from '../utils/formspree';

export const reportsService = {
  submit: async ({ targetType, targetId, reasonCode, reasonDetails }) => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: authError ?? new Error('No autenticado') };
    }

    const result = await supabase
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

    if (!result.error) {
      const reporterEmail = user.email ?? '';
      await submitToFormspree({
        form_type: 'report',
        target_type: targetType,
        target_id: targetId,
        reason_code: reasonCode,
        reason_details: reasonDetails?.trim() || '',
        reporter_email: reporterEmail,
        ...(reporterEmail ? { _replyto: reporterEmail } : {}),
        page_url: typeof window !== 'undefined' ? window.location.href : '',
      });
    }

    return result;
  },
};
