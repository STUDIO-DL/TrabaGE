/** Target output sizes and resize/quality bounds for pre-upload compression. */

export const COMPRESSION_PRESETS = {
  profile: {
    maxWidth: 512,
    maxHeight: 512,
    maxBytes: 300 * 1024,
    qualityStart: 0.85,
    qualityMin: 0.65,
    qualityStep: 0.05,
    extension: 'webp',
    mimeType: 'image/webp',
  },
  logo: {
    maxWidth: 512,
    maxHeight: 512,
    maxBytes: 300 * 1024,
    qualityStart: 0.85,
    qualityMin: 0.65,
    qualityStep: 0.05,
    extension: 'webp',
    mimeType: 'image/webp',
  },
  cover: {
    maxWidth: 1920,
    maxHeight: 1080,
    maxBytes: 500 * 1024,
    qualityStart: 0.85,
    qualityMin: 0.6,
    qualityStep: 0.05,
    extension: 'webp',
    mimeType: 'image/webp',
  },
  post: {
    maxWidth: 1200,
    maxHeight: 12000,
    maxBytes: 500 * 1024,
    qualityStart: 0.85,
    qualityMin: 0.6,
    qualityStep: 0.05,
    extension: 'webp',
    mimeType: 'image/webp',
  },
  verificationImage: {
    maxWidth: 2560,
    maxHeight: 2560,
    maxBytes: 2 * 1024 * 1024,
    qualityStart: 0.9,
    qualityMin: 0.78,
    qualityStep: 0.03,
    extension: 'webp',
    mimeType: 'image/webp',
    safeMode: true,
  },
  educationImage: {
    maxWidth: 2400,
    maxHeight: 2400,
    maxBytes: 2 * 1024 * 1024,
    qualityStart: 0.88,
    qualityMin: 0.75,
    qualityStep: 0.03,
    extension: 'webp',
    mimeType: 'image/webp',
    safeMode: true,
  },
  certificationImage: {
    maxWidth: 2400,
    maxHeight: 2400,
    maxBytes: 2 * 1024 * 1024,
    qualityStart: 0.88,
    qualityMin: 0.75,
    qualityStep: 0.03,
    extension: 'webp',
    mimeType: 'image/webp',
    safeMode: true,
  },
};

export const PDF_COMPRESSION_LIMITS = {
  cv: {
    maxBytes: 2 * 1024 * 1024,
    mimeType: 'application/pdf',
  },
  verificationPdf: {
    maxBytes: 2 * 1024 * 1024,
    mimeType: 'application/pdf',
  },
  educationPdf: {
    maxBytes: 2 * 1024 * 1024,
    mimeType: 'application/pdf',
  },
};

/** Keys used by storage.service to pick a compression strategy. */
export const UPLOAD_COMPRESSION_TYPES = {
  AVATAR: 'avatar',
  CANDIDATE_COVER: 'candidateCover',
  COMPANY_LOGO: 'companyLogo',
  COMPANY_COVER: 'companyCover',
  POST_IMAGE: 'postImage',
  PROJECT_IMAGE: 'projectImage',
  CV: 'cv',
  VERIFICATION_DOC: 'verificationDoc',
  REPRESENTATIVE_VERIFICATION_DOC: 'representativeVerificationDoc',
  EDUCATION_FILE: 'educationFile',
  CERTIFICATION_IMAGE: 'certificationImage',
};

export const UPLOAD_INPUT_MAX_BYTES = {
  image: 10 * 1024 * 1024,
  cv: 10 * 1024 * 1024,
  verification: 10 * 1024 * 1024,
  educationAttachment: 10 * 1024 * 1024,
};
