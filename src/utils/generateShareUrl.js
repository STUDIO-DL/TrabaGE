import { DEEP_LINK_PATHS } from './deepLinks';
import { readViteEnv } from '../config/env';

/** Prefer configured production URL; never bake placeholder/localhost into share links. */
function getAppOrigin() {
  const fromEnv = readViteEnv(import.meta.env.VITE_APP_URL)?.replace(/\/$/, '');
  if (fromEnv && !fromEnv.includes('localhost')) return fromEnv;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return fromEnv || 'https://trabage.org';
}

export const generateShareUrl = (path) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getAppOrigin()}${normalized}`;
};

export const generateProfileUrl = (userId) => generateShareUrl(DEEP_LINK_PATHS.profile(userId));
export const generateCompanyUrl = (companyId) => generateShareUrl(DEEP_LINK_PATHS.company(companyId));
export const generateJobUrl = (jobId) => generateShareUrl(DEEP_LINK_PATHS.job(jobId));
export const generatePostUrl = (postId) => generateShareUrl(DEEP_LINK_PATHS.post(postId));
