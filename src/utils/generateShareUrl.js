const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

export const generateShareUrl = (path) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${APP_URL}${normalized}`;
};

export const generateProfileUrl = (userId) => generateShareUrl(`/profile/${userId}`);
export const generateCompanyUrl = (companyId) => generateShareUrl(`/companies/${companyId}`);
