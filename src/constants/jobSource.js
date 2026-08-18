/** Job listing source: official company offer vs user-shared opportunity. */
export const JOB_SOURCE = {
  COMPANY: 'company',
  USER: 'user',
};

export function getJobSourceType(job) {
  return job?.source_type === JOB_SOURCE.USER ? JOB_SOURCE.USER : JOB_SOURCE.COMPANY;
}

export function isOfficialJob(job) {
  return getJobSourceType(job) === JOB_SOURCE.COMPANY;
}

export function isSharedOpportunity(job) {
  return getJobSourceType(job) === JOB_SOURCE.USER;
}

export function isJobOwner(job, userId) {
  if (!job || !userId) return false;
  if (isSharedOpportunity(job)) {
    return job.shared_by_user_id === userId;
  }
  return job.company_id === userId;
}

export function getSharedPublisherName(job) {
  const publisher = job?.publisher || job?.candidate_profiles;
  return String(publisher?.full_name ?? '').trim();
}

export function getSharedPublisherAvatar(job) {
  const publisher = job?.publisher || job?.candidate_profiles;
  return publisher?.avatar_path ?? null;
}
