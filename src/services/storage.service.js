import { supabase } from '../config/supabase';

export const storageService = {
  uploadAvatar: (userId, file) =>
    supabase.storage.from('avatars').upload(`${userId}/avatar.jpg`, file, { upsert: true }),

  uploadCompanyLogo: (userId, file) =>
    supabase.storage.from('company-logos').upload(`${userId}/logo.png`, file, { upsert: true }),

  uploadCV: (userId, file) =>
    supabase.storage.from('candidate-documents').upload(`${userId}/cv.pdf`, file, { upsert: true }),

  uploadCoverLetter: (userId, file) =>
    supabase.storage
      .from('candidate-documents')
      .upload(`${userId}/cover-letter.pdf`, file, { upsert: true }),

  uploadApplicationCV: (userId, jobId, file) =>
    supabase.storage
      .from('candidate-documents')
      .upload(`${userId}/applications/${jobId}-cv.pdf`, file, { upsert: true }),

  uploadPostImage: (userId, postId, file) =>
    supabase.storage
      .from('post-images')
      .upload(`${userId}/${postId}.jpg`, file, { upsert: true }),

  uploadVerificationDoc: (userId, file) =>
    supabase.storage
      .from('verification-documents')
      .upload(`${userId}/document.pdf`, file, { upsert: true }),

  getSignedUrl: (bucket, path, expiresIn = 3600) =>
    supabase.storage.from(bucket).createSignedUrl(path, expiresIn),

  getPublicUrl: (bucket, path) => supabase.storage.from(bucket).getPublicUrl(path),

  deleteFile: (bucket, path) => supabase.storage.from(bucket).remove([path]),
};
