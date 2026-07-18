import { supabase } from '../config/supabase';
import { reportError } from '../utils/logger';

/**
 * Ensures a welcome email outbox row exists for the current user.
 * The Database Webhook on welcome_email_outbox INSERT invokes send_welcome_email.
 * Idempotent: safe to call after every successful email verification / login.
 */
export async function ensureWelcomeEmailQueued() {
  try {
    const { error } = await supabase.rpc('request_welcome_email_if_needed');
    if (error) {
      reportError(error, { area: 'welcome_email_queue' });
    }
  } catch (err) {
    reportError(err, { area: 'welcome_email_queue' });
  }
}
