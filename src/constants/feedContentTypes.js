export const FEED_CONTENT_TYPES = {
  POST: 'post',
  JOB: 'job',
  NEWS: 'news',
  EVENT: 'event',
  COURSE: 'course',
  ADVICE: 'advice',
  RECOMMENDATION_CARD: 'recommendation_card',
};

export const FEED_RECOMMENDATION_SUBTYPES = {
  BUSINESS: 'business',
  ORGANIZATION: 'organization',
  PERSONAL: 'personal',
  PERSON: 'person',
  // Legacy aliases (feed payloads / cached rows during transition)
  COMPANY: 'business',
  INSTITUTION: 'organization',
  CANDIDATE: 'personal',
};

export const FEED_MAX_CONSECUTIVE_SAME_TYPE = 2;

export const FEED_PAGE_SIZE = 25;

/** Stored company_profiles.company_type values that classify an Organization account. */
export const ORGANIZATION_COMPANY_TYPES = ['Institucion publica', 'ONG'];

/** @deprecated Use ORGANIZATION_COMPANY_TYPES */
export const INSTITUTION_COMPANY_TYPES = ORGANIZATION_COMPANY_TYPES;

export const NEWS_CATEGORIES = [
  { value: 'employment', label: 'Empleo' },
  { value: 'tech', label: 'Tecnología' },
  { value: 'ai', label: 'IA' },
  { value: 'business', label: 'Business' },
  { value: 'economy', label: 'Economía' },
  { value: 'education', label: 'Educación' },
  { value: 'labor', label: 'Mercado laboral' },
];

export const EVENT_TYPES = [
  { value: 'job_fair', label: 'Feria de empleo' },
  { value: 'congress', label: 'Congreso' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'career_day', label: 'Jornada profesional' },
  { value: 'other', label: 'Otro' },
];
