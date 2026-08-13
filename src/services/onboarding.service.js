import { queryClient } from '../config/queryClient';
import { getOwnCandidateProfileKey } from '../constants/profileQueryKeys';
import {
  ONBOARDING_STATUS,
  MAX_ONBOARDING_STEP,
  getOnboardingCurrentStep,
  getOnboardingData,
  getOnboardingTotalSteps,
} from '../constants/onboarding';
import { profileService } from './profile.service';
import { analyticsService } from './analytics.service';

const EXPERIENCE_TO_YEARS = {
  'Sin experiencia': 0,
  'Menos de 1 año': 0,
  '1-3 años': 2,
  '1–3 años': 2,
  '3-5 años': 4,
  '3–5 años': 4,
  '5-10 años': 7,
  '5–10 años': 7,
  'Más de 10 años': 11,
};

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value ?? {}).filter(([, entry]) => entry !== undefined),
  );
}

function mergeProfileCache(userId, row) {
  if (!userId || !row) return;
  queryClient.setQueryData(getOwnCandidateProfileKey(userId), (current) => ({
    ...(current ?? {}),
    ...row,
    onboarding_data: {
      ...getOnboardingData(current),
      ...getOnboardingData(row),
    },
  }));
}

export function buildOnboardingProfilePatch(data = {}) {
  const patch = {};

  if (data.profession) {
    patch.headline = data.profession;
    patch.sector = data.profession;
  }

  if (data.user_type === 'student' && data.study_area) {
    patch.headline = `Estudiante de ${data.study_area}`;
    patch.sector = data.sector_interest || data.study_area;
  }

  if (data.city) patch.city = data.city;
  if (data.country) patch.country = data.country;
  if (data.experience_range) {
    patch.years_experience = EXPERIENCE_TO_YEARS[data.experience_range] ?? null;
  }

  if (data.opportunity_types?.length || data.opportunity_locations?.length) {
    patch.job_preferences = compactObject({
      opportunity_types: data.opportunity_types ?? [],
      preferred_locations: data.opportunity_locations ?? [],
      availability: data.opportunity_types?.[0] ?? null,
      preferred_work_modes: data.opportunity_types?.filter((item) =>
        ['Remoto', 'Freelance'].includes(item),
      ) ?? [],
      student_priority: data.user_type === 'student',
    });
  }

  return patch;
}

export const onboardingService = {
  saveStep: async (userId, profile, dataPatch, nextStep = null) => {
    const currentData = getOnboardingData(profile);
    const mergedData = compactObject({ ...currentData, ...dataPatch });
    const step = nextStep ?? getOnboardingCurrentStep(profile);
    const payload = {
      ...buildOnboardingProfilePatch(mergedData),
      onboarding_status: ONBOARDING_STATUS.IN_PROGRESS,
      onboarding_current_step: step,
      onboarding_data: mergedData,
    };

    const result = await profileService.updateCandidateProfile(userId, payload);
    if (!result.error) mergeProfileCache(userId, result.data);
    return result;
  },

  setCurrentStep: async (userId, profile, step) => {
    const payload = {
      onboarding_status:
        profile?.onboarding_status === ONBOARDING_STATUS.COMPLETED
          ? ONBOARDING_STATUS.COMPLETED
          : ONBOARDING_STATUS.IN_PROGRESS,
      onboarding_current_step: step,
      onboarding_data: getOnboardingData(profile),
    };
    const result = await profileService.updateCandidateProfile(userId, payload);
    if (!result.error) mergeProfileCache(userId, result.data);
    return result;
  },

  complete: async (userId, profile) => {
    const data = getOnboardingData(profile);
    const total = getOnboardingTotalSteps(data);
    const payload = {
      ...buildOnboardingProfilePatch(data),
      onboarding_status: ONBOARDING_STATUS.COMPLETED,
      onboarding_current_step: Math.min(total, MAX_ONBOARDING_STEP),
      onboarding_data: { ...data, completed_at: new Date().toISOString() },
      setup_complete: true,
    };
    const result = await profileService.updateCandidateProfile(userId, payload);
    if (!result.error) mergeProfileCache(userId, result.data);
    return result;
  },

  addSkills: async (userId, skills = []) => {
    const unique = [...new Set(skills.map((skill) => String(skill || '').trim()).filter(Boolean))];
    for (const skill of unique) {
      await profileService.addSkill({ user_id: userId, name: skill });
    }
  },

  addServices: async (userId, services = []) => {
    const unique = [...new Set(services.map((service) => String(service || '').trim()).filter(Boolean))];
    for (const service of unique) {
      await profileService.addService({ user_id: userId, name: service });
    }
  },

  track: (userId, eventType, metadata = {}) => {
    if (!userId) return;
    void analyticsService.trackOnboardingEvent(userId, eventType, metadata).catch(() => {});
  },
};
