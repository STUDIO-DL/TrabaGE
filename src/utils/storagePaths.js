import { supabaseUrl } from '../config/supabase';
import { STORAGE_BUCKETS } from '../constants/storage';

const PUBLIC_URL_PATTERN = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;

export function extractStoragePath(value, _bucket) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http')) {
    const match = trimmed.match(PUBLIC_URL_PATTERN);
    if (match) return decodeURIComponent(match[2].split('?')[0]);
    return null;
  }

  return trimmed.split('?')[0];
}

export function resolvePublicStorageUrl(bucket, pathOrUrl) {
  const path = extractStoragePath(pathOrUrl, bucket);
  if (!path) return null;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export function resolveAvatarUrl(avatarPath) {
  return resolvePublicStorageUrl(STORAGE_BUCKETS.CANDIDATE_AVATARS, avatarPath);
}

export function resolveLogoUrl(logoPath) {
  return resolvePublicStorageUrl(STORAGE_BUCKETS.COMPANY_LOGOS, logoPath);
}

export function resolvePostImageUrl(postImagePath) {
  return resolvePublicStorageUrl(STORAGE_BUCKETS.POST_IMAGES, postImagePath);
}

export function resolveCompanyCoverUrl(coverPath) {
  return resolvePublicStorageUrl(STORAGE_BUCKETS.COMPANY_LOGOS, coverPath);
}

export function resolveCandidateCoverUrl(coverPath) {
  return resolvePublicStorageUrl(STORAGE_BUCKETS.CANDIDATE_AVATARS, coverPath);
}

export function resolveCvBucket(path) {
  if (!path) return STORAGE_BUCKETS.CANDIDATE_CVS;
  if (path.includes('/applications/')) return 'candidate-documents';
  return STORAGE_BUCKETS.CANDIDATE_CVS;
}
