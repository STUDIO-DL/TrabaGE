import { DEEP_LINK_PATHS } from './deepLinks';

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

export const generateShareUrl = (path) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${APP_URL}${normalized}`;
};

export const generateProfileUrl = (userId) => generateShareUrl(DEEP_LINK_PATHS.profile(userId));
export const generateCompanyUrl = (companyId) => generateShareUrl(DEEP_LINK_PATHS.company(companyId));
export const generateJobUrl = (jobId) => generateShareUrl(DEEP_LINK_PATHS.job(jobId));
export const generatePostUrl = (postId) => generateShareUrl(DEEP_LINK_PATHS.post(postId));
