import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SKILL_SUGGESTIONS } from '../constants/skills';
import { SERVICE_SUGGESTIONS } from '../constants/services';
import { SECTORS } from '../constants/sectors';
import { LOCATION_DATA, COUNTRIES, CITIES_BY_COUNTRY } from '../constants/locations';
import INSTITUTIONS from '../data/institutions';

/**
 * Prefetch common onboarding catalogs into React Query cache and
 * warm up next-screen bundles via dynamic import.
 */
export default function useOnboardingPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prime static suggestion lists so UI reads from cache synchronously.
    try {
      queryClient.setQueryData(['onboarding', 'skills'], SKILL_SUGGESTIONS);
      queryClient.setQueryData(['onboarding', 'services'], SERVICE_SUGGESTIONS);
      queryClient.setQueryData(['onboarding', 'sectors'], SECTORS);
      queryClient.setQueryData(['onboarding', 'locations'], LOCATION_DATA);
      queryClient.setQueryData(['onboarding', 'countries'], COUNTRIES);
      queryClient.setQueryData(['onboarding', 'citiesByCountry'], CITIES_BY_COUNTRY);
      queryClient.setQueryData(['onboarding', 'institutions'], INSTITUTIONS);
    } catch (e) {
      // best-effort
      // eslint-disable-next-line no-console
      console.warn('Prefetch: unable to prime onboarding cache', e);
    }

    // Warm next-screen bundles (lazy imports). Best-effort: don't await.
    void import('../pages/candidate/EditIntro');
    void import('../pages/setup/CandidateSetup');
    void import('../components/profile/modals/EducationModal');
  }, [queryClient]);
}
