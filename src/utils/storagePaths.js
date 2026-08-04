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

/** Cache-bust token stored as `path?v=…` or on a public URL query string. */
export function extractStorageVersion(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith('http')) {
      return new URL(trimmed).searchParams.get('v');
    }
    const qIndex = trimmed.indexOf('?');
    if (qIndex === -1) return null;
    return new URLSearchParams(trimmed.slice(qIndex + 1)).get('v');
  } catch {
    return null;
  }
}

/**
 * Stable storage object key + a new `?v=` so browsers / PWA CacheFirst
 * fetch the replaced bytes instead of serving a stale object at the same path.
 */
export function versionedStoragePath(pathOrUrl, bucket) {
  const path = extractStoragePath(pathOrUrl, bucket);
  if (!path) return null;
  return `${path}?v=${Date.now()}`;
}

export function resolvePublicStorageUrl(bucket, pathOrUrl) {
  const path = extractStoragePath(pathOrUrl, bucket);
  if (!path) return null;
  const base = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  const version = extractStorageVersion(pathOrUrl);
  if (!version) return base;
  return `${base}?v=${encodeURIComponent(version)}`;
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

export function resolveJobOpportunityImageUrl(imagePath) {
  return resolvePublicStorageUrl(STORAGE_BUCKETS.POST_IMAGES, imagePath);
}

export function resolveProjectImageUrl(imagePath) {
  return resolvePublicStorageUrl(STORAGE_BUCKETS.PROFILE_PROJECTS, imagePath);
}

export function resolveCertificationImageUrl(imagePath) {
  return resolvePublicStorageUrl(STORAGE_BUCKETS.CANDIDATE_CERTIFICATIONS, imagePath);
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
