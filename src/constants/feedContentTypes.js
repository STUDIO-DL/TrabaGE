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
  COMPANY: 'company',
  INSTITUTION: 'institution',
  CANDIDATE: 'candidate',
  PERSON: 'person',
};

export const FEED_MAX_CONSECUTIVE_SAME_TYPE = 2;

export const FEED_PAGE_SIZE = 25;

export const INSTITUTION_COMPANY_TYPES = ['Institucion publica', 'ONG'];

export const NEWS_CATEGORIES = [
  { value: 'employment', label: 'Empleo' },
  { value: 'tech', label: 'Tecnología' },
  { value: 'ai', label: 'IA' },
  { value: 'business', label: 'Negocios' },
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
