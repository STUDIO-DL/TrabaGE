import { supabase } from '../config/supabase';
import { calculateJobMatch, MATCH_THRESHOLD } from '../utils/calculateJobMatch';
import { notificationsService } from './notifications.service';

const MATCH_FUNCTION = 'match_job_recommendations';

async function fetchEligibleCandidates() {
  const { data, error } = await supabase
    .from('candidate_profiles')
    .select(
      `
      user_id,
      headline,
      about,
      years_experience,
      job_preferences,
      notifications_enabled,
      notification_frequency,
      onesignal_player_id,
      skills(name),
      experience(position)
    `,
    )
    .eq('notifications_enabled', true)
    .eq('setup_complete', true);

  return { data: data ?? [], error };
}

function buildMatchPayload(candidates, job) {
  return candidates
    .map((candidate) => ({
      user_id: candidate.user_id,
      score: calculateJobMatch(candidate, job),
      player_id: candidate.onesignal_player_id,
      frequency: candidate.notification_frequency ?? 'instant',
    }))
    .filter((item) => item.score >= MATCH_THRESHOLD);
}

export const jobRecommendationsService = {
  processNewJob: async (job) => {
    if (!job?.id) return { data: null, error: new Error('Job inválido') };

    try {
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke(
        MATCH_FUNCTION,
        { body: { job_id: job.id } },
      );

      if (!edgeError && edgeResult) {
        const pushIds = edgeResult.push_recipient_ids ?? [];
        if (pushIds.length) {
          await notificationsService.sendJobRecommendationPush({
            recipientIds: pushIds,
            jobTitle: job.title,
            jobId: job.id,
            playerIdsByUser: edgeResult.player_ids_by_user ?? {},
          });
        }
        return { data: edgeResult, error: null };
      }
    } catch (error) {
      console.warn('[TrabaGE] Edge function unavailable, using client fallback:', error);
    }

    const { data: fullJob, error: jobError } = await supabase
      .from('jobs')
      .select('*, company_profiles(company_name, sector)')
      .eq('id', job.id)
      .single();

    if (jobError || !fullJob) {
      return { data: null, error: jobError ?? new Error('No se pudo cargar el empleo') };
    }

    const { data: candidates, error: candidatesError } = await fetchEligibleCandidates();
    if (candidatesError) {
      return { data: null, error: candidatesError };
    }

    const matches = buildMatchPayload(candidates, fullJob);
    if (!matches.length) {
      return { data: { in_app_count: 0, push_recipient_ids: [] }, error: null };
    }

    const { data: notifyResult, error: notifyError } = await supabase.rpc(
      'notify_job_recommendations',
      {
        p_job_id: job.id,
        p_matches: matches.map(({ user_id, score }) => ({ user_id, score })),
      },
    );

    if (notifyError) {
      return { data: null, error: notifyError };
    }

    const pushIds = Array.isArray(notifyResult?.push_recipient_ids)
      ? notifyResult.push_recipient_ids
      : [];
    if (pushIds.length) {
      const playerMap = Object.fromEntries(
        matches
          .filter((item) => pushIds.includes(item.user_id) && item.player_id)
          .map((item) => [item.user_id, item.player_id]),
      );

      await notificationsService.sendJobRecommendationPush({
        recipientIds: pushIds,
        jobTitle: fullJob.title,
        jobId: fullJob.id,
        playerIdsByUser: playerMap,
      });
    }

    return { data: notifyResult, error: null };
  },
};
