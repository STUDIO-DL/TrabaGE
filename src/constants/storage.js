export const STORAGE_BUCKETS = {
  CANDIDATE_CVS: 'candidate-cvs',
  CANDIDATE_AVATARS: 'candidate-avatars',
  CANDIDATE_EDUCATION_FILES: 'candidate-education-files',
  COMPANY_LOGOS: 'company-logos',
  POST_IMAGES: 'post-images',
  PROFILE_PROJECTS: 'profile-projects',
  COMPANY_VERIFICATIONS: 'company-verifications',
};

export const cvPath = (userId) => `${userId}/cv.pdf`;
export const avatarPath = (userId) => `${userId}/avatar.webp`;
export const candidateCoverPath = (userId) => `${userId}/cover.webp`;
export const logoPath = (companyId) => `${companyId}/logo.webp`;
export const companyCoverPath = (companyId) => `${companyId}/cover.webp`;
export const postImagePath = (userId, postId) => `${userId}/${postId}.webp`;
export const companyVerificationDocPath = (companyId) => `${companyId}/company-document.pdf`;
export const representativeVerificationDocPath = (companyId) =>
  `${companyId}/representative-document.pdf`;
/** @deprecated Use companyVerificationDocPath */
export const verificationDocPath = companyVerificationDocPath;
export const educationFilePath = (userId, educationId, fileId, fileName) =>
  `${userId}/education/${educationId}/${fileId}-${fileName}`;
export const projectImagePath = (userId, projectId) => `${userId}/projects/${projectId}.webp`;
