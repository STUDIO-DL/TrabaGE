import { supabase } from '../config/supabase';

/**
 * Idempotent welcome email trigger (fallback when Database Webhook is not configured).
 * Primary path: auth.users trigger → welcome_email_outbox → webhook → send_welcome_email.
 */
export const welcomeEmailService = {
  triggerIfNeeded(userId) {
    if (!userId) return;

    void supabase.functions
      .invoke('send_welcome_email', {
        body: { user_id: userId },
      })
      .catch((error) => {
        console.warn('[TrabaGE] Welcome email trigger skipped:', error?.message || error);
      });
  },
};
