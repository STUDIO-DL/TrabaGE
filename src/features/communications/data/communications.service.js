import { supabase } from '../../../config/supabase';
import { adminService } from '../../../services/admin.service';
import { formToPayload } from '../domain/constants';

function asError(error) {
  if (!error) return null;
  if (error instanceof Error) return error;
  return new Error(String(error.message || error));
}

/**
 * Data layer for the Communications centre.
 * Admin writes go through SECURITY DEFINER RPCs; user reads use get_active_communications_for_me.
 */
export const communicationsService = {
  async listCampaigns() {
    const { data, error } = await supabase.rpc('admin_list_communication_campaigns');
    return { data: data ?? [], error: asError(error) };
  },

  async upsertCampaign(form) {
    const payload = formToPayload(form);
    const { data, error } = await supabase.rpc('admin_upsert_communication_campaign', {
      p_payload: payload,
    });
    if (error) return { data: null, error: asError(error) };

    if (payload.send_push && data?.is_active && data?.id) {
      const starts = data.starts_at ? new Date(data.starts_at) : new Date();
      const shouldSendNow = starts.getTime() <= Date.now() + 60_000;
      if (shouldSendNow) {
        const audience = payload.audience?.all
          ? { all: true }
          : {
              roles: (payload.audience?.roles || []).filter((r) => r !== 'guest'),
            };
        await adminService.sendAdminPushBroadcast({
          title: payload.title,
          body: payload.description || payload.title,
          link: payload.link_url || '/personal/feed',
          audienceFilter: audience.all || !audience.roles?.length ? { all: true } : audience,
        });
      }
    }

    return { data, error: null };
  },

  async duplicateCampaign(campaignId) {
    const { data, error } = await supabase.rpc('admin_duplicate_communication_campaign', {
      p_campaign_id: campaignId,
    });
    return { data, error: asError(error) };
  },

  async setCampaignActive(campaignId, isActive) {
    const { data, error } = await supabase.rpc('admin_set_communication_campaign_active', {
      p_campaign_id: campaignId,
      p_is_active: isActive,
    });
    return { data, error: asError(error) };
  },

  async deleteCampaign(campaignId) {
    const { data, error } = await supabase.rpc('admin_delete_communication_campaign', {
      p_campaign_id: campaignId,
    });
    return { data, error: asError(error) };
  },

  async getCampaignStats(campaignId, filters = {}) {
    const { data, error } = await supabase.rpc('admin_get_communication_campaign_stats', {
      p_campaign_id: campaignId,
      p_filters: filters,
    });
    return { data, error: asError(error) };
  },

  async resendCampaign(campaignId, mode, intervalDays = null) {
    const { data, error } = await supabase.rpc('admin_resend_communication_campaign', {
      p_campaign_id: campaignId,
      p_mode: mode,
      p_interval_days: intervalDays,
    });
    return { data, error: asError(error) };
  },

  async getActiveForMe() {
    const { data, error } = await supabase.rpc('get_active_communications_for_me');
    return { data: data ?? [], error: asError(error) };
  },

  async recordEvent(campaignId, eventType, meta = {}) {
    const { data, error } = await supabase.rpc('record_communication_event', {
      p_campaign_id: campaignId,
      p_event_type: eventType,
      p_meta: meta,
    });
    return { data, error: asError(error) };
  },

  async submitResponse({
    campaignId,
    rating,
    improvementText,
    commentText,
    appVersion,
    accountType,
  }) {
    const { data, error } = await supabase.rpc('submit_communication_response', {
      p_campaign_id: campaignId,
      p_rating: rating ?? null,
      p_improvement_text: improvementText ?? null,
      p_comment_text: commentText ?? null,
      p_app_version: appVersion ?? null,
      p_account_type: accountType ?? null,
    });
    return { data, error: asError(error) };
  },
};
