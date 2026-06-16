import { supabase } from '../config/supabase';
import { VERIFICATION_BUCKET } from '../utils/companyVerification';

export const storageService = {
  uploadAvatar: (userId, file) =>
    supabase.storage.from('avatars').upload(`${userId}/avatar.jpg`, file, { upsert: true }),

  uploadCompanyLogo: (userId, file) =>
    supabase.storage.from('company-logos').upload(`${userId}/logo.png`, file, { upsert: true }),

  uploadCompanyCover: (userId, file) =>
    supabase.storage.from('company-logos').upload(`${userId}/cover.jpg`, file, { upsert: true }),

  uploadCV: (userId, file) =>
    supabase.storage.from('candidate-documents').upload(`${userId}/cv.pdf`, file, { upsert: true }),

  uploadCoverLetter: (userId, file) =>
    supabase.storage
      .from('candidate-documents')
      .upload(`${userId}/cover-letter.pdf`, file, { upsert: true }),

  uploadApplicationCV: (userId, jobId, file, path) =>
    supabase.storage
      .from('candidate-documents')
      .upload(path || `${userId}/applications/cvs/${jobId}-${Date.now()}.pdf`, file, { upsert: true }),

  uploadPostImage: (userId, postId, file) =>
    supabase.storage
      .from('post-images')
      .upload(`${userId}/posts/${postId}.jpg`, file, { upsert: true }),

  uploadVerificationDoc: (userId, file) => {
    const safeName = `${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
    const path = `${userId}/${safeName}`;

    return supabase.storage
      .from(VERIFICATION_BUCKET)
      .upload(path, file, { upsert: false })
      .then((result) => ({
        ...result,
        data: result.data ? { ...result.data, path } : result.data,
      }));
  },

  getSignedUrl: (bucket, path, expiresIn = 3600) =>
    supabase.storage.from(bucket).createSignedUrl(path, expiresIn),

  getPublicUrl: (bucket, path) => supabase.storage.from(bucket).getPublicUrl(path),

  deleteFile: (bucket, path) => supabase.storage.from(bucket).remove([path]),
};
