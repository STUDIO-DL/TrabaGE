/** Campaign type taxonomy — shared by admin form and user surfaces. */
export const CAMPAIGN_TYPES = {
  INFO: 'info',
  FEEDBACK: 'feedback',
  SURVEY: 'survey',
  LEGAL: 'legal',
  FEATURE: 'feature',
  MAINTENANCE: 'maintenance',
  PROMOTION: 'promotion',
  OTHER: 'other',
};

export const CAMPAIGN_TYPE_OPTIONS = [
  { value: CAMPAIGN_TYPES.INFO, label: 'Información' },
  { value: CAMPAIGN_TYPES.FEEDBACK, label: 'Feedback' },
  { value: CAMPAIGN_TYPES.SURVEY, label: 'Encuesta' },
  { value: CAMPAIGN_TYPES.LEGAL, label: 'Legal' },
  { value: CAMPAIGN_TYPES.FEATURE, label: 'Nueva función' },
  { value: CAMPAIGN_TYPES.MAINTENANCE, label: 'Mantenimiento' },
  { value: CAMPAIGN_TYPES.PROMOTION, label: 'Promoción' },
  { value: CAMPAIGN_TYPES.OTHER, label: 'Otro' },
];

export const AUDIENCE_ROLE_OPTIONS = [
  { value: 'personal', label: 'Profesionales' },
  { value: 'business', label: 'Empresas' },
  { value: 'organization', label: 'Organizaciones' },
  { value: 'guest', label: 'Usuarios invitados' },
];

/** Dynamic segment rules (AND/OR). Values map 1:1 to SQL rule ids. */
export const SEGMENT_RULE_OPTIONS = [
  { id: 'profile_incomplete', label: 'Perfil incompleto', group: 'Perfil', needsValue: false },
  {
    id: 'profile_pct_between',
    label: 'Perfil entre % (min–max)',
    group: 'Perfil',
    needsValue: 'range',
    defaults: { min: 0, max: 30 },
  },
  {
    id: 'profile_pct_lt',
    label: 'Perfil por debajo de %',
    group: 'Perfil',
    needsValue: 'number',
    defaults: { value: 50 },
  },
  {
    id: 'profile_pct_gt',
    label: 'Perfil superior a %',
    group: 'Perfil',
    needsValue: 'number',
    defaults: { value: 70 },
  },
  { id: 'no_avatar', label: 'Sin foto de perfil', group: 'Perfil', needsValue: false },
  { id: 'no_experience', label: 'Sin experiencia profesional', group: 'Perfil', needsValue: false },
  { id: 'no_education', label: 'Sin educación', group: 'Perfil', needsValue: false },
  { id: 'no_skills', label: 'Sin habilidades', group: 'Perfil', needsValue: false },
  { id: 'no_certifications', label: 'Sin certificaciones', group: 'Perfil', needsValue: false },
  { id: 'no_projects', label: 'Sin proyectos', group: 'Perfil', needsValue: false },
  { id: 'no_about', label: 'Sin descripción profesional', group: 'Perfil', needsValue: false },
  { id: 'no_description', label: 'Sin descripción (empresa/org)', group: 'Perfil', needsValue: false },
  { id: 'no_services', label: 'Sin servicios publicados', group: 'Actividad', needsValue: false },
  { id: 'no_posts', label: 'Sin publicaciones', group: 'Actividad', needsValue: false },
  { id: 'no_connections', label: 'Sin conexiones', group: 'Actividad', needsValue: false },
  { id: 'no_applications', label: 'Sin candidaturas enviadas', group: 'Actividad', needsValue: false },
  { id: 'no_jobs', label: 'Empresas sin ofertas publicadas', group: 'Empresa', needsValue: false },
  { id: 'no_org_content', label: 'Organizaciones sin contenido', group: 'Empresa', needsValue: false },
  {
    id: 'inactive_days',
    label: 'Sin iniciar sesión durante X días',
    group: 'Engagement',
    needsValue: 'days',
    defaults: { days: 30 },
  },
  {
    id: 'registered_within_days',
    label: 'Nuevos usuarios (últimos X días)',
    group: 'Engagement',
    needsValue: 'days',
    defaults: { days: 7 },
  },
  {
    id: 'registered_days_gte',
    label: 'Registrados hace más de X días',
    group: 'Engagement',
    needsValue: 'days',
    defaults: { days: 7 },
  },
  {
    id: 'never_survey_response',
    label: 'Nunca respondieron a una encuesta',
    group: 'Engagement',
    needsValue: false,
  },
];

export const CAMPAIGN_BEHAVIORS = {
  ONCE: 'once',
  UNTIL_RESPOND: 'until_respond',
  UNTIL_DISMISS: 'until_dismiss',
  ALWAYS: 'always',
};

export const BEHAVIOR_OPTIONS = [
  { value: CAMPAIGN_BEHAVIORS.ONCE, label: 'Mostrar una sola vez' },
  { value: CAMPAIGN_BEHAVIORS.UNTIL_RESPOND, label: 'Mostrar hasta responder' },
  { value: CAMPAIGN_BEHAVIORS.UNTIL_DISMISS, label: 'Mostrar hasta cerrar' },
  { value: CAMPAIGN_BEHAVIORS.ALWAYS, label: 'Mostrar siempre durante la vigencia' },
];

export const LINK_TYPES = {
  NONE: 'none',
  INTERNAL: 'internal',
  EXTERNAL: 'external',
  DOCUMENT: 'document',
};

export const LINK_TYPE_OPTIONS = [
  { value: LINK_TYPES.NONE, label: 'Sin enlace' },
  { value: LINK_TYPES.INTERNAL, label: 'Página interna' },
  { value: LINK_TYPES.EXTERNAL, label: 'URL externa' },
  { value: LINK_TYPES.DOCUMENT, label: 'Documento' },
];

export const RESEND_INTERVAL_OPTIONS = [
  { value: 3, label: '3 días' },
  { value: 7, label: '7 días' },
  { value: 15, label: '15 días' },
  { value: 30, label: '30 días' },
  { value: null, label: 'Nunca' },
];

export const RESEND_MODES = {
  PENDING: 'pending',
  DISMISSED: 'dismissed',
  NEVER_OPENED: 'never_opened',
};

export const RESEND_MODE_OPTIONS = [
  { value: RESEND_MODES.PENDING, label: 'Reenviar a todos los pendientes' },
  { value: RESEND_MODES.DISMISSED, label: 'Reenviar solo a quienes cerraron' },
  { value: RESEND_MODES.NEVER_OPENED, label: 'Reenviar solo a quienes nunca la abrieron' },
];

export const LIFECYCLE_STATUS = {
  ACTIVE: 'active',
  SCHEDULED: 'scheduled',
  ENDED: 'ended',
  INACTIVE: 'inactive',
};

export const LIFECYCLE_LABELS = {
  [LIFECYCLE_STATUS.ACTIVE]: 'Activa',
  [LIFECYCLE_STATUS.SCHEDULED]: 'Programada',
  [LIFECYCLE_STATUS.ENDED]: 'Finalizada',
  [LIFECYCLE_STATUS.INACTIVE]: 'Desactivada',
};

export const CTA_PRESETS = [
  'Ver más',
  'Responder',
  'Leer',
  'Actualizar',
  'Aceptar',
  'Comenzar',
  'Completar perfil',
];

export const CONVERSION_GOAL_OPTIONS = [
  { value: '', label: 'Ninguno' },
  { value: 'profile_complete', label: 'Completar perfil' },
  { value: 'cta_click', label: 'Clic en botón principal' },
];

export const DEFAULT_FEEDBACK_CONTENT = {
  cardTitle: 'Nos gustaría conocer tu opinión.',
  cardBody: 'Tu experiencia nos ayuda a mejorar TrabaGE.',
  sheetTitle: '¿Cómo está siendo tu experiencia con TrabaGE?',
  sheetBody: 'Tu opinión nos ayuda a construir una mejor plataforma para toda la comunidad.',
  ratingQuestion: '¿Cómo calificarías tu experiencia?',
  improvementLabel: '¿Qué podríamos mejorar?',
  commentLabel: '¿Quieres añadir algún comentario?',
  thanksMessage: 'Gracias por ayudarnos a mejorar TrabaGE.',
};

const PROFILE_COMPLETE_MESSAGE = `Tu perfil es tu carta de presentación en TrabaGE.

Los perfiles más completos ayudan a que otras personas y empresas conozcan mejor tu experiencia, habilidades y trayectoria.

Completar tu perfil puede ayudarte a:

• Dar una mejor primera impresión.
• Mostrar tu experiencia y formación.
• Destacar tus habilidades y certificaciones.
• Aumentar tus posibilidades de aparecer en búsquedas.
• Facilitar que empresas y organizaciones descubran tu perfil.

Solo te llevará unos minutos.`;

/** Ready-made campaign templates for the admin form. */
export const CAMPAIGN_TEMPLATES = {
  completeProfile: {
    title: 'Completa tu perfil y aumenta tus oportunidades.',
    description: PROFILE_COMPLETE_MESSAGE,
    campaign_type: CAMPAIGN_TYPES.INFO,
    audienceAll: false,
    audienceRoles: ['personal'],
    audienceRules: [
      { id: 'profile_pct_lt', value: 50 },
      { id: 'registered_days_gte', days: 7 },
    ],
    ruleLogic: 'and',
    behavior: CAMPAIGN_BEHAVIORS.UNTIL_DISMISS,
    allow_dismiss: true,
    primary_cta_label: 'Completar perfil',
    secondary_cta_label: 'Más tarde',
    link_type: LINK_TYPES.INTERNAL,
    link_url: '/personal/profile/edit-intro',
    send_push: true,
    is_active: true,
    resend_interval_days: 15,
    conversion_goal: 'profile_complete',
    automationEnabled: true,
    automationMinIntervalDays: 15,
  },
};

export function isFeedbackSurface(type) {
  return type === CAMPAIGN_TYPES.FEEDBACK || type === CAMPAIGN_TYPES.SURVEY;
}

function ruleLabel(rule) {
  const meta = SEGMENT_RULE_OPTIONS.find((o) => o.id === rule.id);
  const base = meta?.label || rule.id;
  if (rule.id === 'profile_pct_between') return `${base}: ${rule.min}–${rule.max}%`;
  if (rule.value != null && meta?.needsValue === 'number') return `${base}: ${rule.value}%`;
  if (rule.days != null) return `${base}: ${rule.days}d`;
  return base;
}

export function formatAudienceLabel(audience) {
  if (!audience) return '—';
  const rolesPart = audience.all
    ? 'Todos'
    : (() => {
        const roles = Array.isArray(audience.roles) ? audience.roles : [];
        if (!roles.length) return '—';
        const map = Object.fromEntries(AUDIENCE_ROLE_OPTIONS.map((o) => [o.value, o.label]));
        return roles.map((r) => map[r] || r).join(', ');
      })();
  const rules = Array.isArray(audience.rules) ? audience.rules : [];
  if (!rules.length) return rolesPart;
  const logic = (audience.rule_logic || 'and').toUpperCase();
  const rulesPart = rules.map(ruleLabel).join(` ${logic} `);
  return `${rolesPart} · ${rulesPart}`;
}

export function formatCampaignType(type) {
  return CAMPAIGN_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;
}

function localNowInput() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function emptyCampaignForm() {
  return {
    id: null,
    title: '',
    description: '',
    campaign_type: CAMPAIGN_TYPES.INFO,
    audienceAll: true,
    audienceRoles: [],
    audienceRules: [],
    ruleLogic: 'and',
    starts_at: localNowInput(),
    ends_at: '',
    behavior: CAMPAIGN_BEHAVIORS.ONCE,
    allow_dismiss: true,
    primary_cta_label: 'Ver más',
    secondary_cta_label: '',
    link_type: LINK_TYPES.NONE,
    link_url: '',
    send_push: false,
    is_active: true,
    resend_interval_days: null,
    conversion_goal: '',
    automationEnabled: false,
    automationMinIntervalDays: 15,
    content: { ...DEFAULT_FEEDBACK_CONTENT },
  };
}

export function applyCampaignTemplate(templateKey) {
  const tpl = CAMPAIGN_TEMPLATES[templateKey];
  if (!tpl) return emptyCampaignForm();
  return {
    ...emptyCampaignForm(),
    ...tpl,
    content: { ...DEFAULT_FEEDBACK_CONTENT },
  };
}

export function campaignToForm(campaign) {
  const audience = campaign.audience || { all: true };
  const automation = campaign.automation || {};
  const toLocal = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  return {
    id: campaign.id,
    title: campaign.title || '',
    description: campaign.description || '',
    campaign_type: campaign.campaign_type || CAMPAIGN_TYPES.INFO,
    audienceAll: Boolean(audience.all),
    audienceRoles: Array.isArray(audience.roles) ? [...audience.roles] : [],
    audienceRules: Array.isArray(audience.rules) ? audience.rules.map((r) => ({ ...r })) : [],
    ruleLogic: audience.rule_logic === 'or' ? 'or' : 'and',
    starts_at: toLocal(campaign.starts_at),
    ends_at: toLocal(campaign.ends_at),
    behavior: campaign.behavior || CAMPAIGN_BEHAVIORS.ONCE,
    allow_dismiss: campaign.allow_dismiss !== false,
    primary_cta_label: campaign.primary_cta_label || 'Ver más',
    secondary_cta_label: campaign.secondary_cta_label || '',
    link_type: campaign.link_type || LINK_TYPES.NONE,
    link_url: campaign.link_url || '',
    send_push: Boolean(campaign.send_push),
    is_active: campaign.is_active !== false,
    resend_interval_days: campaign.resend_interval_days ?? null,
    conversion_goal: campaign.conversion_goal || '',
    automationEnabled: Boolean(automation.enabled),
    automationMinIntervalDays: automation.min_interval_days ?? 15,
    content: { ...DEFAULT_FEEDBACK_CONTENT, ...(campaign.content || {}) },
  };
}

export function formToPayload(form) {
  const baseAudience = form.audienceAll
    ? { all: true }
    : { roles: form.audienceRoles.length ? form.audienceRoles : ['personal'] };

  const rules = Array.isArray(form.audienceRules) ? form.audienceRules.filter((r) => r?.id) : [];
  const audience = {
    ...baseAudience,
    rule_logic: form.ruleLogic === 'or' ? 'or' : 'and',
    rules,
  };

  return {
    id: form.id || undefined,
    title: form.title.trim(),
    description: form.description.trim(),
    campaign_type: form.campaign_type,
    audience,
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    behavior: form.behavior,
    allow_dismiss: Boolean(form.allow_dismiss),
    primary_cta_label: form.primary_cta_label.trim() || 'Ver más',
    secondary_cta_label: form.secondary_cta_label.trim() || null,
    link_type: form.link_type,
    link_url: form.link_type === LINK_TYPES.NONE ? null : form.link_url.trim() || null,
    send_push: Boolean(form.send_push),
    is_active: Boolean(form.is_active),
    resend_interval_days: form.resend_interval_days,
    conversion_goal: form.conversion_goal || null,
    automation: {
      enabled: Boolean(form.automationEnabled),
      min_interval_days: Number(form.automationMinIntervalDays) || 15,
    },
    content: form.content || {},
  };
}
