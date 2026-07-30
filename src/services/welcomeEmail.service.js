import { supabase } from '../config/supabase';
import { reportError } from '../utils/logger';

/**
 * ACCOUNT_REGISTRATION_COMPLETED
 *
 * Queues the one-time welcome email AFTER TrabaGE registration succeeds.
 *
 * Call ONLY from:
 * - AuthConfirm (email verification registration complete)
 * - Register.jsx (OAuth role completion after profile bind)
 * - AuthCallback when oauthIntent === SIGNUP and post-auth flow finished
 *
 * NEVER call from:
 * - Google LOGIN
 * - signInWithGoogle / loginWithGoogle
 * - onAuthStateChange / session restore
 * - account-not-found modal
 * - first authenticated session without registration
 *
 * Server gate: request_welcome_email_if_needed requires
 * is_trabage_registration_complete (profile/role/signup metadata).
 * OAuth INSERT triggers no longer auto-queue welcome emails.
 */
export async function queueWelcomeEmailOnRegistrationComplete() {
  try {
    const results = await Promise.all([
      supabase.rpc('request_welcome_email_if_needed'),
      supabase.rpc('enqueue_profile_completion_reminder_if_needed'),
    ]);

    if (results[0]?.error) {
      reportError(results[0].error, { area: 'welcome_email_queue' });
    }
    if (results[1]?.error) {
      reportError(results[1].error, { area: 'profile_completion_reminder_queue' });
    }
  } catch (err) {
    reportError(err, { area: 'welcome_email_queue' });
  }
}
