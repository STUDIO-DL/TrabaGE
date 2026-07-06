import { calculateJobMatch } from './calculateJobMatch';
import { compareCandidateCompleteness } from './profileCompleteness';

function sortByInternalScore(items, scoreFn, tieBreakFn = () => 0) {
  return [...items]
    .map((item) => ({ item, score: scoreFn(item) }))
    .sort(
      (a, b) =>
        b.score - a.score
        || tieBreakFn(a.item, b.item)
        || (a.item.rank ?? 0) - (b.item.rank ?? 0),
    )
    .map(({ item }) => item);
}

/**
 * Re-ranks global search job results for a candidate profile (score stays internal).
 */
export function rankSearchJobsForCandidate(results, jobsById, userProfile) {
  if (!userProfile || !results?.length) return results;

  const jobResults = results.filter((item) => item.type === 'job');
  if (!jobResults.length) return results;

  const rankedJobs = sortByInternalScore(jobResults, (item) => {
    const job = jobsById.get(item.id);
    return job ? calculateJobMatch(userProfile, job) : 0;
  });

  const other = results.filter((item) => item.type !== 'job');
  return [...rankedJobs, ...other];
}

/**
 * Re-ranks global search candidate results for a company (best score across active jobs).
 */
export function rankSearchCandidatesForCompany(results, candidatesById, companyJobs) {
  if (!companyJobs?.length || !results?.length) return results;

  const candidateResults = results.filter((item) => item.type === 'candidate');
  if (!candidateResults.length) return results;

  const rankedCandidates = sortByInternalScore(candidateResults, (item) => {
    const candidate = candidatesById.get(item.id);
    if (!candidate) return 0;

    return companyJobs.reduce((best, job) => {
      const score = calculateJobMatch(candidate, job);
      return Math.max(best, score);
    }, 0);
  }, (a, b) => {
    const candidateA = candidatesById.get(a.id);
    const candidateB = candidatesById.get(b.id);
    return compareCandidateCompleteness(candidateA, candidateB);
  });

  const other = results.filter((item) => item.type !== 'candidate');
  return [...rankedCandidates, ...other];
}
