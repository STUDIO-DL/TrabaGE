import { supabase } from '../config/supabase';
import {
  STORAGE_BUCKETS,
  avatarPath,
  candidateCoverPath,
  companyCoverPath,
  cvPath,
  logoPath,
  postImagePath,
  projectImagePath,
  companyVerificationDocPath,
  representativeVerificationDocPath,
  verificationDocPath,
  educationFilePath,
} from '../constants/storage';
import { UPLOAD_COMPRESSION_TYPES } from '../constants/compressionPresets';
import { UPLOAD_PHASES } from '../constants/uploadPhases';
import { storageCompressionService } from './storageCompression.service';

const WEBP_CONTENT_TYPE = 'image/webp';
const PDF_CONTENT_TYPE = 'application/pdf';

async function uploadReplace(bucket, path, file, contentType) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType });

  return { data, error, path };
}

async function prepareCompressedUpload(file, uploadType, options = {}) {
  const { onProgress } = options;
  const prepared = await storageCompressionService.prepareForUpload(file, uploadType, {
    onProgress: (payload) => onProgress?.(payload),
  });
  onProgress?.({ phase: UPLOAD_PHASES.UPLOADING });
  return prepared;
}

export const storageService = {
  deleteOldCV: async (userId, oldPath) => {
    const paths = [oldPath, cvPath(userId)].filter(Boolean);
    const unique = [...new Set(paths)];
    if (!unique.length) return { error: null };
    const { error } = await supabase.storage.from(STORAGE_BUCKETS.CANDIDATE_CVS).remove(unique);
    return { error };
  },

  deleteOldVerificationDocuments: async (companyId, oldPaths = []) => {
    const paths = [
      ...oldPaths,
      companyVerificationDocPath(companyId),
      representativeVerificationDocPath(companyId),
      verificationDocPath(companyId),
    ].filter(Boolean);
    const unique = [...new Set(paths)];
    if (!unique.length) return { error: null };
    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS.COMPANY_VERIFICATIONS)
      .remove(unique);
    return { error };
  },

  deleteOldVerificationDocument: async (companyId, oldPath) =>
    storageService.deleteOldVerificationDocuments(companyId, oldPath ? [oldPath] : []),

  deleteOldAvatar: async (userId, oldPath) => {
    const paths = [oldPath, avatarPath(userId), `${userId}/avatar.jpg`, `${userId}/avatar.png`].filter(
      Boolean,
    );
    const unique = [...new Set(paths)];
    if (!unique.length) return { error: null };
    const { error } = await supabase.storage.from(STORAGE_BUCKETS.CANDIDATE_AVATARS).remove(unique);
    return { error };
  },

  deleteOldLogo: async (companyId, oldPath) => {
    const paths = [logoPath(companyId)];
    if (oldPath?.endsWith('.webp')) paths.unshift(oldPath);
    const unique = [...new Set(paths.filter(Boolean))];
    if (!unique.length) return { error: null };
    const { error } = await supabase.storage.from(STORAGE_BUCKETS.COMPANY_LOGOS).remove(unique);
    return { error };
  },

  deleteOldPostImage: async (userId, postId, oldPath) => {
    const paths = [
      oldPath,
      postImagePath(userId, postId),
      `${userId}/${postId}.jpg`,
      `${userId}/posts/${postId}.jpg`,
    ].filter(Boolean);
    const unique = [...new Set(paths)];
    if (!unique.length) return { error: null };
    const { error } = await supabase.storage.from(STORAGE_BUCKETS.POST_IMAGES).remove(unique);
    return { error };
  },

  uploadAvatar: async (userId, file, _oldPath, options = {}) => {
    const path = avatarPath(userId);
    const { file: preparedFile, contentType } = await prepareCompressedUpload(
      file,
      UPLOAD_COMPRESSION_TYPES.AVATAR,
      options,
    );
    return uploadReplace(
      STORAGE_BUCKETS.CANDIDATE_AVATARS,
      path,
      preparedFile,
      contentType || WEBP_CONTENT_TYPE,
    );
  },

  deleteCandidateCover: async (userId, oldPath) => {
    const paths = [oldPath, candidateCoverPath(userId)].filter(Boolean);
    const unique = [...new Set(paths)];
    if (!unique.length) return { error: null };
    const { error } = await supabase.storage.from(STORAGE_BUCKETS.CANDIDATE_AVATARS).remove(unique);
    return { error };
  },

  uploadCandidateCover: async (userId, file, _oldPath, options = {}) => {
    const path = candidateCoverPath(userId);
    const { file: preparedFile, contentType } = await prepareCompressedUpload(
      file,
      UPLOAD_COMPRESSION_TYPES.CANDIDATE_COVER,
      options,
    );
    return uploadReplace(
      STORAGE_BUCKETS.CANDIDATE_AVATARS,
      path,
      preparedFile,
      contentType || WEBP_CONTENT_TYPE,
    );
  },

  uploadCompanyLogo: async (companyId, file, _oldPath, options = {}) => {
    const path = logoPath(companyId);
    const { file: preparedFile, contentType } = await prepareCompressedUpload(
      file,
      UPLOAD_COMPRESSION_TYPES.COMPANY_LOGO,
      options,
    );
    return uploadReplace(
      STORAGE_BUCKETS.COMPANY_LOGOS,
      path,
      preparedFile,
      contentType || WEBP_CONTENT_TYPE,
    );
  },

  uploadCompanyCover: async (companyId, file, _oldPath, options = {}) => {
    const path = companyCoverPath(companyId);
    const { file: preparedFile, contentType } = await prepareCompressedUpload(
      file,
      UPLOAD_COMPRESSION_TYPES.COMPANY_COVER,
      options,
    );
    return uploadReplace(
      STORAGE_BUCKETS.COMPANY_LOGOS,
      path,
      preparedFile,
      contentType || WEBP_CONTENT_TYPE,
    );
  },

  uploadCV: async (userId, file, _oldPath, options = {}) => {
    const path = cvPath(userId);
    const { file: preparedFile, contentType } = await prepareCompressedUpload(
      file,
      UPLOAD_COMPRESSION_TYPES.CV,
      options,
    );
    return uploadReplace(
      STORAGE_BUCKETS.CANDIDATE_CVS,
      path,
      preparedFile,
      contentType || PDF_CONTENT_TYPE,
    );
  },

  uploadPostImage: async (userId, postId, file, _oldPath, options = {}) => {
    const path = postImagePath(userId, postId);
    const { file: preparedFile, contentType } = await prepareCompressedUpload(
      file,
      UPLOAD_COMPRESSION_TYPES.POST_IMAGE,
      options,
    );
    return uploadReplace(
      STORAGE_BUCKETS.POST_IMAGES,
      path,
      preparedFile,
      contentType || WEBP_CONTENT_TYPE,
    );
  },

  uploadVerificationDoc: async (companyId, file, _oldPath, options = {}) => {
    const path = companyVerificationDocPath(companyId);
    const { file: preparedFile, contentType } = await prepareCompressedUpload(
      file,
      UPLOAD_COMPRESSION_TYPES.VERIFICATION_DOC,
      options,
    );
    const result = await uploadReplace(
      STORAGE_BUCKETS.COMPANY_VERIFICATIONS,
      path,
      preparedFile,
      contentType || preparedFile.type || PDF_CONTENT_TYPE,
    );
    return {
      ...result,
      data: result.data ? { ...result.data, path } : result.data,
    };
  },

  uploadRepresentativeVerificationDoc: async (companyId, file, _oldPath, options = {}) => {
    const path = representativeVerificationDocPath(companyId);
    const { file: preparedFile, contentType } = await prepareCompressedUpload(
      file,
      UPLOAD_COMPRESSION_TYPES.REPRESENTATIVE_VERIFICATION_DOC,
      options,
    );
    const result = await uploadReplace(
      STORAGE_BUCKETS.COMPANY_VERIFICATIONS,
      path,
      preparedFile,
      contentType || preparedFile.type || PDF_CONTENT_TYPE,
    );
    return {
      ...result,
      data: result.data ? { ...result.data, path } : result.data,
    };
  },

  getSignedUrl: (bucket, path, expiresIn = 3600) =>
    supabase.storage.from(bucket).createSignedUrl(path, expiresIn),

  getPublicUrl: (bucket, path) => supabase.storage.from(bucket).getPublicUrl(path),

  deleteFile: (bucket, path) => supabase.storage.from(bucket).remove([path]),

  uploadEducationFile: async (userId, educationId, file, fileId, options = {}) => {
    const { file: preparedFile, contentType } = await prepareCompressedUpload(
      file,
      UPLOAD_COMPRESSION_TYPES.EDUCATION_FILE,
      options,
    );
    const safeName = preparedFile.name.replace(/[^\w.\-()+\s]/g, '_').slice(0, 120);
    const path = educationFilePath(userId, educationId, fileId, safeName);
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.CANDIDATE_EDUCATION_FILES)
      .upload(path, preparedFile, { upsert: false, contentType: contentType || preparedFile.type || undefined });

    return {
      data,
      error,
      path,
      meta: {
        path,
        name: preparedFile.name,
        size: preparedFile.size,
        mimeType: contentType || preparedFile.type || null,
      },
    };
  },

  deleteEducationFiles: async (paths = []) => {
    const unique = [...new Set(paths.filter(Boolean))];
    if (!unique.length) return { error: null };
    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS.CANDIDATE_EDUCATION_FILES)
      .remove(unique);
    return { error };
  },

  deleteProjectImage: async (userId, projectId, oldPath) => {
    const paths = [oldPath, projectImagePath(userId, projectId)].filter(Boolean);
    const unique = [...new Set(paths)];
    if (!unique.length) return { error: null };
    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS.PROFILE_PROJECTS)
      .remove(unique);
    return { error };
  },

  uploadProjectImage: async (userId, projectId, file, _oldPath, options = {}) => {
    const path = projectImagePath(userId, projectId);
    const { file: preparedFile, contentType } = await prepareCompressedUpload(
      file,
      UPLOAD_COMPRESSION_TYPES.PROJECT_IMAGE,
      options,
    );
    return uploadReplace(
      STORAGE_BUCKETS.PROFILE_PROJECTS,
      path,
      preparedFile,
      contentType || WEBP_CONTENT_TYPE,
    );
  },
};
