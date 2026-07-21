/** Candidate profile sub-collections loaded by getCandidateFullProfile. */
export const CANDIDATE_SECTION_KEYS = [
  'education',
  'experience',
  'certifications',
  'skills',
  'candidate_links',
  'services',
  'languages',
  'projects',
];

export function emptyCandidateSections() {
  return Object.fromEntries(CANDIDATE_SECTION_KEYS.map((key) => [key, []]));
}

/** True when the cached profile includes section arrays (not a base-only row). */
export function hasCandidateSections(profile) {
  return Boolean(profile && Array.isArray(profile.education));
}

/**
 * Merge a base candidate_profiles row onto a full profile without wiping sections.
 * PostgREST base selects omit education/experience/…; spreading them as undefined
 * previously erased in-memory section data after intro/basic saves.
 */
export function mergeCandidateProfileRow(current, row) {
  if (!row) return current ?? null;
  if (!current) {
    return hasCandidateSections(row) ? row : { ...emptyCandidateSections(), ...row };
  }

  const merged = { ...current, ...row };
  for (const key of CANDIDATE_SECTION_KEYS) {
    if (row[key] === undefined && current[key] !== undefined) {
      merged[key] = current[key];
    }
  }
  return merged;
}
