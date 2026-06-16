import { ROLES } from './roles';

export const PREVIEW_STORAGE_KEY = 'trabage_preview_mode';
export const PREVIEW_ROLE_KEY = 'trabage_preview_role';
export const PREVIEW_COVER_KEY = 'trabage_preview_cover';
export const PREVIEW_LOGO_KEY = 'trabage_preview_logo';

export const PREVIEW_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'preview@trabage.demo',
  user_metadata: { preview: true },
};

export const PREVIEW_CANDIDATE_IDS = {
  ana: '00000000-0000-0000-0000-000000000301',
  carlos: '00000000-0000-0000-0000-000000000302',
};

const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();

export const PREVIEW_CANDIDATE_PROFILE = {
  user_id: PREVIEW_USER.id,
  full_name: 'Usuario demo',
  headline: 'Explorando TrabaGE',
  about: 'Perfil de vista previa para explorar la aplicación.',
  city: 'Malabo',
  years_experience: 3,
  setup_complete: true,
  avatar_path: null,
  experience: [],
  education: [],
  certifications: [],
  skills: [],
  services: [],
  languages: [],
  job_preferences: {
    preferred_cities: ['Malabo'],
    preferred_job_types: ['full-time'],
    preferred_sectors: [],
    keywords: [],
  },
};

export const PREVIEW_APPLICANT_PROFILES = {
  [PREVIEW_CANDIDATE_IDS.ana]: {
    user_id: PREVIEW_CANDIDATE_IDS.ana,
    full_name: 'Ana Obiang',
    headline: 'Desarrolladora frontend',
    about: 'Especialista en React y diseño de interfaces. Busco oportunidades en Malabo.',
    city: 'Malabo',
    years_experience: 4,
    avatar_path: null,
    experience: [
      {
        id: 'preview-exp-1',
        title: 'Desarrolladora web',
        company: 'Digital Malabo',
        start_date: '2021-03',
        end_date: null,
        current: true,
      },
    ],
    education: [],
    certifications: [],
    skills: [{ id: 'preview-skill-1', name: 'React' }, { id: 'preview-skill-2', name: 'JavaScript' }],
    services: [],
    languages: [{ id: 'preview-lang-1', language: 'Español', level: 'Nativo' }],
  },
  [PREVIEW_CANDIDATE_IDS.carlos]: {
    user_id: PREVIEW_CANDIDATE_IDS.carlos,
    full_name: 'Carlos Nguema',
    headline: 'Técnico de soporte IT',
    about: 'Experiencia en redes, soporte y administración de sistemas.',
    city: 'Bata',
    years_experience: 6,
    avatar_path: null,
    experience: [],
    education: [],
    certifications: [],
    skills: [{ id: 'preview-skill-3', name: 'Redes' }],
    services: [],
    languages: [],
  },
};

export const PREVIEW_COMPANY_PROFILE = {
  user_id: PREVIEW_USER.id,
  company_name: '',
  sector: null,
  city: null,
  description: null,
  setup_complete: true,
  logo_path: null,
  cover_url: null,
  verified_status: 'unverified',
  is_verified: false,
  verification_status: 'not_submitted',
  verified_at: null,
  company_type: null,
  company_size: null,
  founded_year: null,
  website: null,
  contact_name: null,
  contact_role: null,
  contact_email: null,
  contact_whatsapp: null,
  contact_phone: null,
  company_services: [],
};

export const PREVIEW_COMPANY_JOBS = [];

export const PREVIEW_COMPANY_POSTS = [];

export const PREVIEW_FEED_POSTS = [...PREVIEW_COMPANY_POSTS];

export const PREVIEW_COMPANY_APPLICATIONS = [];

export const PREVIEW_COMPANY_VERIFICATION = {
  status: 'pending',
  document_name: 'registro-mercantil.pdf',
  review_notes: null,
  created_at: daysAgo(4),
  submitted_at: daysAgo(4),
};

export function getPreviewMode() {
  return sessionStorage.getItem(PREVIEW_STORAGE_KEY) === 'true';
}

export function isPreviewActive(isPreviewModeState = false) {
  return isPreviewModeState || getPreviewMode();
}

export function getPreviewRole() {
  return sessionStorage.getItem(PREVIEW_ROLE_KEY);
}

export function clearPreviewMode() {
  sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
  sessionStorage.removeItem(PREVIEW_ROLE_KEY);
  sessionStorage.removeItem(PREVIEW_COVER_KEY);
  sessionStorage.removeItem(PREVIEW_LOGO_KEY);
}

export function getPreviewMediaUrls() {
  return {
    cover_url: sessionStorage.getItem(PREVIEW_COVER_KEY),
    logo_path: sessionStorage.getItem(PREVIEW_LOGO_KEY),
  };
}

export function setPreviewMediaUrl(type, url) {
  const key = type === 'logo' ? PREVIEW_LOGO_KEY : PREVIEW_COVER_KEY;
  if (url) sessionStorage.setItem(key, url);
  else sessionStorage.removeItem(key);
}

export function resetPreviewState() {
  clearPreviewMode();
}

export function setPreviewModeActive() {
  sessionStorage.setItem(PREVIEW_STORAGE_KEY, 'true');
}

export function setPreviewRoleStorage(role) {
  sessionStorage.setItem(PREVIEW_ROLE_KEY, role);
}

export function getPreviewProfile(role) {
  return role === ROLES.COMPANY ? PREVIEW_COMPANY_PROFILE : PREVIEW_CANDIDATE_PROFILE;
}

export function getPreviewApplicantProfile(userId) {
  return PREVIEW_APPLICANT_PROFILES[userId] ?? null;
}

export function getPreviewPosts(authorId, role) {
  if (authorId === PREVIEW_USER.id && role === ROLES.COMPANY) {
    return PREVIEW_COMPANY_POSTS;
  }
  return PREVIEW_FEED_POSTS;
}

export function getPreviewApplications(role) {
  if (role === ROLES.COMPANY) return PREVIEW_COMPANY_APPLICATIONS;
  return [];
}

export function getPreviewCompanyJobs() {
  return PREVIEW_COMPANY_JOBS;
}

export function isPreviewUserId(userId) {
  return userId === PREVIEW_USER.id || Boolean(PREVIEW_APPLICANT_PROFILES[userId]);
}
