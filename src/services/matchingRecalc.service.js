import { supabase } from '../config/supabase';
import { jobMatchesService } from './jobMatches.service';
import { reportError } from '../utils/logger';

/**
 * Processes queued recommendation recalc events (DB triggers → worker).
 * Intended for service-role edge functions or admin cron; safe no-op on client if RPC blocked.
 */
export const matchingRecalcService = {
  claimBatch: (limit = 25) =>
    supabase.rpc('claim_recommendation_recalc_batch', { p_limit: limit }),

  processEvent: async (event) => {
    if (!event?.subject_type || !event?.subject_id) return { ok: false };

    if (event.subject_type === 'candidate') {
      const { error } = await jobMatchesService.recalculateForCandidate(event.subject_id);
      if (error) reportError(error, { area: 'matching_recalc_candidate', event });
      return { ok: !error };
    }

    if (event.subject_type === 'job') {
      const { error } = await jobMatchesService.recalculateForJob(event.subject_id);
      if (error) reportError(error, { area: 'matching_recalc_job', event });
      return { ok: !error };
    }

    return { ok: true };
  },

  processPendingBatch: async (limit = 10) => {
    const { data: events, error } = await matchingRecalcService.claimBatch(limit);
    if (error) {
      // Client cannot claim batch (service_role only) — fall back silently.
      if (error.code === '42501' || error.message?.includes('permission')) {
        return { processed: 0, error: null };
      }
      return { processed: 0, error };
    }

    let processed = 0;
    for (const event of events ?? []) {
      const result = await matchingRecalcService.processEvent(event);
      if (result.ok) processed += 1;
    }

    return { processed, error: null };
  },
};
