import { supabase } from '../config/supabase';
import { reportError } from '../utils/logger';

/**
 * Queues the one-time welcome email after registration completes.
 * Call only from registration completion handlers (email verify, OAuth signup finish).
 * Never call from login, session restore, refresh, or OAuth login.
 *
 * Idempotent via DB checks on welcome_emails_sent + welcome_email_outbox.
 */
export async function queueWelcomeEmailOnRegistrationComplete() {
  try {
    const { error } = await supabase.rpc('request_welcome_email_if_needed');
    if (error) {
      reportError(error, { area: 'welcome_email_queue' });
    }
  } catch (err) {
    reportError(err, { area: 'welcome_email_queue' });
  }
}
