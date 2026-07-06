import { useMemo } from 'react';
import { getCandidateCompletenessDetails } from '../utils/profileCompleteness';
import { summarizeProfileQuality } from '../utils/profileQuality';

/**
 * Internal profile signals for matching and future AI suggestions.
 * Does not render UI by itself.
 */
export function useProfileQuality(profile) {
  return useMemo(() => {
    if (!profile) {
      return {
        completeness: { level: 'basic', basicPassed: 0, advancedPassed: 0 },
        quality: { issues: [], issueCount: 0, severeCount: 0, isStrong: false },
      };
    }

    return {
      completeness: getCandidateCompletenessDetails(profile),
      quality: summarizeProfileQuality(profile),
    };
  }, [profile]);
}
