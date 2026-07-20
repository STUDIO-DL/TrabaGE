import { DEEP_LINK_PATHS } from './deepLinks';
import { readViteEnv } from '../config/env';
import { stripUsernameAt } from './username';

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

/** Prefer /@username when available; fall back to UUID profile path. */
export const generateProfileUrl = (userId, username) => {
  const byUser = username ? DEEP_LINK_PATHS.byUsername(stripUsernameAt(username)) : null;
  if (byUser) return generateShareUrl(byUser);
  return generateShareUrl(DEEP_LINK_PATHS.profile(userId));
};

export const generateCompanyUrl = (companyId, username) => {
  const byUser = username ? DEEP_LINK_PATHS.byUsername(stripUsernameAt(username)) : null;
  if (byUser) return generateShareUrl(byUser);
  return generateShareUrl(DEEP_LINK_PATHS.company(companyId));
};

export const generateJobUrl = (jobId) => generateShareUrl(DEEP_LINK_PATHS.job(jobId));
export const generatePostUrl = (postId) => generateShareUrl(DEEP_LINK_PATHS.post(postId));
