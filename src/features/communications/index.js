export { communicationsService } from './data/communications.service';
export {
  CAMPAIGN_TYPES,
  CAMPAIGN_TYPE_OPTIONS,
  AUDIENCE_ROLE_OPTIONS,
  SEGMENT_RULE_OPTIONS,
  BEHAVIOR_OPTIONS,
  LINK_TYPE_OPTIONS,
  RESEND_INTERVAL_OPTIONS,
  RESEND_MODE_OPTIONS,
  LIFECYCLE_LABELS,
  CTA_PRESETS,
  CONVERSION_GOAL_OPTIONS,
  DEFAULT_FEEDBACK_CONTENT,
  CAMPAIGN_TEMPLATES,
  isFeedbackSurface,
  formatAudienceLabel,
  formatCampaignType,
  emptyCampaignForm,
  applyCampaignTemplate,
  campaignToForm,
  formToPayload,
} from './domain/constants';
export { default as CommunicationsHost } from './ui/CommunicationsHost';
