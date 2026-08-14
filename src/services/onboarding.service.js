import { profileService } from './profile.service';
import { reportError } from '../utils/logger';

const CHOICE_KEY = 'trabage_onboarding_choice_v1';
const STUDENT_KEY = 'trabage_onboarding_student_v1';
const PROFESSIONAL_KEY = 'trabage_onboarding_professional_v1';

export function readLocalOnboarding() {
  try {
    const rawChoice = localStorage.getItem(CHOICE_KEY);
    const rawStudent = localStorage.getItem(STUDENT_KEY);
    const rawProfessional = localStorage.getItem(PROFESSIONAL_KEY);

    return {
      choice: rawChoice ? JSON.parse(rawChoice) : null,
      student: rawStudent ? JSON.parse(rawStudent) : null,
      professional: rawProfessional ? JSON.parse(rawProfessional) : null,
    };
  } catch (err) {
    reportError(err, { area: 'readLocalOnboarding' });
    return { choice: null, student: null, professional: null };
  }
}

export function buildOnboardingPayload(localData = {}) {
  const { choice, student, professional } = localData;
  const payload = {
    choice: choice ?? null,
    student: student ?? null,
    professional: professional ?? null,
    synced_at: new Date().toISOString(),
  };
  return payload;
}

/**
 * Sync local onboarding object into candidate profile.job_preferences.
 * Uses upsert to create or update the profile row.
 */
export async function syncOnboardingToProfile(userId) {
  if (!userId) return { data: null, error: { message: 'missing userId' } };

  try {
    const local = readLocalOnboarding();
    const payload = buildOnboardingPayload(local);

    // Store as JSON in `job_preferences` column (existing schema expects JSON-like values).
    const upsertPayload = { user_id: userId, job_preferences: payload };

    const res = await profileService.upsertCandidateProfile(upsertPayload);
    return res;
  } catch (err) {
    reportError(err, { area: 'syncOnboardingToProfile', userId });
    return { data: null, error: err };
  }
}

export default {
  readLocalOnboarding,
  buildOnboardingPayload,
  syncOnboardingToProfile,
};
