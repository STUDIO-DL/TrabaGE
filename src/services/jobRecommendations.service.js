import { supabase } from '../config/supabase';
import { notificationsService } from './notifications.service';
import { reportError } from '../utils/logger';

const MATCH_FUNCTION = 'match_job_recommendations';

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
          });
        }
        return { data: edgeResult, error: null };
      }
    } catch (error) {
      reportError(error, { area: 'job_recommendations_edge_unavailable', jobId: job.id });
    }

    return {
      data: {
        in_app_count: 0,
        push_recipient_ids: [],
        reason: 'edge_function_required',
      },
      error: null,
    };
  },
};
