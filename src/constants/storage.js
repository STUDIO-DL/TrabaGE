export const STORAGE_BUCKETS = {
  CANDIDATE_CVS: 'candidate-cvs',
  CANDIDATE_AVATARS: 'candidate-avatars',
  COMPANY_LOGOS: 'company-logos',
  POST_IMAGES: 'post-images',
  COMPANY_VERIFICATIONS: 'company-verifications',
};

export const cvPath = (userId) => `${userId}/cv.pdf`;
export const avatarPath = (userId) => `${userId}/avatar.webp`;
export const logoPath = (companyId) => `${companyId}/logo.webp`;
export const companyCoverPath = (companyId) => `${companyId}/cover.webp`;
export const postImagePath = (userId, postId) => `${userId}/${postId}.webp`;
export const verificationDocPath = (companyId) => `${companyId}/verification-document.pdf`;
