import { supabase } from '../config/supabase';
import {
  STORAGE_BUCKETS,
  avatarPath,
  companyCoverPath,
  cvPath,
  logoPath,
  postImagePath,
  verificationDocPath,
} from '../constants/storage';

const WEBP_CONTENT_TYPE = 'image/webp';
const PDF_CONTENT_TYPE = 'application/pdf';

async function removeIfExists(bucket, path) {
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}

async function uploadReplace(bucket, path, file, contentType) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType });

  return { data, error, path };
}

export const storageService = {
  deleteOldCV: async (userId, oldPath) => {
    const paths = [oldPath, cvPath(userId)].filter(Boolean);
    const unique = [...new Set(paths)];
    if (!unique.length) return { error: null };
    const { error } = await supabase.storage.from(STORAGE_BUCKETS.CANDIDATE_CVS).remove(unique);
    return { error };
  },

  deleteOldVerificationDocument: async (companyId, oldPath) => {
    const paths = [oldPath, verificationDocPath(companyId)].filter(Boolean);
    const unique = [...new Set(paths)];
    if (!unique.length) return { error: null };
    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS.COMPANY_VERIFICATIONS)
      .remove(unique);
    return { error };
  },

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
    const paths = [
      oldPath,
      logoPath(companyId),
      `${companyId}/logo.png`,
      `${companyId}/logo.jpg`,
    ].filter(Boolean);
    const unique = [...new Set(paths)];
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

  uploadAvatar: async (userId, file, oldPath) => {
    await storageService.deleteOldAvatar(userId, oldPath);
    const path = avatarPath(userId);
    return uploadReplace(STORAGE_BUCKETS.CANDIDATE_AVATARS, path, file, WEBP_CONTENT_TYPE);
  },

  uploadCompanyLogo: async (companyId, file, oldPath) => {
    await storageService.deleteOldLogo(companyId, oldPath);
    const path = logoPath(companyId);
    return uploadReplace(STORAGE_BUCKETS.COMPANY_LOGOS, path, file, WEBP_CONTENT_TYPE);
  },

  uploadCompanyCover: async (companyId, file, oldPath) => {
    if (oldPath) await removeIfExists(STORAGE_BUCKETS.COMPANY_LOGOS, oldPath);
    const path = companyCoverPath(companyId);
    return uploadReplace(STORAGE_BUCKETS.COMPANY_LOGOS, path, file, WEBP_CONTENT_TYPE);
  },

  uploadCV: async (userId, file, oldPath) => {
    await storageService.deleteOldCV(userId, oldPath);
    const path = cvPath(userId);
    return uploadReplace(STORAGE_BUCKETS.CANDIDATE_CVS, path, file, PDF_CONTENT_TYPE);
  },

  uploadPostImage: async (userId, postId, file, oldPath) => {
    await storageService.deleteOldPostImage(userId, postId, oldPath);
    const path = postImagePath(userId, postId);
    return uploadReplace(STORAGE_BUCKETS.POST_IMAGES, path, file, WEBP_CONTENT_TYPE);
  },

  uploadVerificationDoc: async (companyId, file, oldPath) => {
    await storageService.deleteOldVerificationDocument(companyId, oldPath);
    const path = verificationDocPath(companyId);
    const contentType = file.type || PDF_CONTENT_TYPE;
    const result = await uploadReplace(
      STORAGE_BUCKETS.COMPANY_VERIFICATIONS,
      path,
      file,
      contentType,
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
};
