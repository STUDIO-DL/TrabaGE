import { supabase } from '../../config/supabase';
import { jobsService } from '../../services/jobs.service';
import { applicationsService } from '../../services/applications.service';
import { followsService, FOLLOWS_TARGET } from '../../services/follows.service';

function pctDelta(current, previous) {
  if (previous == null || current == null) return null;
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function daysActive(job) {
  if (!job?.created_at) return 0;
  const start = new Date(job.created_at).getTime();
  const end =
    job.status === 'active' || job.status === 'paused'
      ? Date.now()
      : new Date(job.updated_at || job.created_at).getTime();
  return Math.round(((end - start) / 86400000) * 10) / 10;
}

/** Client-side fallback when RPC is not yet deployed. */
async function buildFallbackSummary(userId, role) {
  const targetType =
    role === 'organization' ? FOLLOWS_TARGET.ORGANIZATION : FOLLOWS_TARGET.BUSINESS;

  const [jobsRes, appsRes, followersRes] = await Promise.all([
    jobsService.getCompanyJobs(userId),
    applicationsService.getJobApplicants(userId),
    followsService.getFollowerCount(targetType, userId),
  ]);

  if (jobsRes.error && appsRes.error) {
    return { data: null, error: jobsRes.error || appsRes.error };
  }

  const followers =
    typeof followersRes?.data === 'number'
      ? followersRes.data
      : Number(followersRes?.data ?? 0) || 0;

  const jobs = jobsRes.data ?? [];
  const applications = [...(appsRes.data ?? [])].sort(
    (a, b) => new Date(b.applied_at || 0) - new Date(a.applied_at || 0),
  );
  const activeJobs = jobs
    .filter((j) => j.status === 'active')
    .slice(0, 8)
    .map((j) => ({
      id: j.id,
      title: j.title,
      status: j.status,
      created_at: j.created_at,
      city: j.city,
      job_type: j.job_type,
      work_mode: j.work_mode,
      days_active: daysActive(j),
      views: 0,
      applications: j.applications_count ?? 0,
    }));

  const weekStart = Date.now() - 7 * 86400000;
  const prevWeekStart = Date.now() - 14 * 86400000;
  const weekApps = applications.filter((a) => new Date(a.applied_at).getTime() >= weekStart).length;
  const prevWeekApps = applications.filter((a) => {
    const t = new Date(a.applied_at).getTime();
    return t >= prevWeekStart && t < weekStart;
  }).length;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const newAppsToday = applications.filter(
    (a) => new Date(a.applied_at).getTime() >= todayStart.getTime(),
  ).length;

  const applicants = applications.slice(0, 8).map((a) => ({
    id: a.id,
    user_id: a.candidate_id,
    job_id: a.job_id,
    status: a.status,
    funnel_status:
      a.status === 'accepted'
        ? 'accepted'
        : a.status === 'rejected'
          ? 'rejected'
          : a.status === 'withdrawn'
            ? 'withdrawn'
            : 'pending',
    applied_at: a.applied_at,
    full_name: a.candidate_profiles?.full_name || a.full_name || 'Candidato',
    avatar_path: a.candidate_profiles?.avatar_path,
    job_title: a.jobs?.title || '',
  }));

  const chart_30d = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (29 - i));
    const day = d.toISOString().slice(0, 10);
    const applicationsCount = applications.filter(
      (a) => a.applied_at && a.applied_at.slice(0, 10) === day,
    ).length;
    return { day, views: 0, applications: applicationsCount };
  });

  const activity = [
    ...applicants.slice(0, 6).map((a) => ({
      id: `app-${a.id}`,
      type: 'application',
      at: a.applied_at,
      title: 'Nueva candidatura',
      detail: `${a.full_name} aplicó a «${a.job_title || 'una oferta'}»`,
    })),
    ...activeJobs.slice(0, 4).map((j) => ({
      id: `job-${j.id}`,
      type: 'job_published',
      at: j.created_at,
      title: 'Oferta publicada',
      detail: `Oferta «${j.title}» publicada`,
    })),
  ]
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
    .slice(0, 12);

  return {
    data: {
      company: null,
      stats: {
        applications_total: applications.length,
        applications_week: weekApps,
        applications_prev_week: prevWeekApps,
        applications_delta_pct: pctDelta(weekApps, prevWeekApps),
        views_total: 0,
        views_week: 0,
        views_prev_week: 0,
        views_delta_pct: 0,
        followers_total: followers,
        followers_week: 0,
        followers_prev_week: 0,
        followers_delta_pct: 0,
        interactions_total: 0,
        interactions_week: 0,
        interactions_prev_week: 0,
        interactions_delta_pct: 0,
        jobs_active: jobs.filter((j) => j.status === 'active').length,
        jobs_total: jobs.length,
        posts_total: 0,
        unread_notifications: 0,
        new_applications_today: newAppsToday,
        new_profile_visits_today: 0,
        new_notifications_today: 0,
      },
      jobs: activeJobs,
      applicants,
      chart_30d,
      activity,
      generated_at: new Date().toISOString(),
      _source: 'fallback',
    },
    error: null,
  };
}

export const companyDashboardService = {
  getSummary: async ({ userId, role } = {}) => {
    const { data, error } = await supabase.rpc('get_company_dashboard_summary');
    if (!error) return { data, error: null };

    // Missing RPC / migration not applied → graceful fallback.
    const code = error?.code || error?.message || '';
    const missingFn =
      String(code).includes('PGRST202') ||
      String(error?.message || '').toLowerCase().includes('could not find') ||
      String(error?.message || '').toLowerCase().includes('function');

    if (missingFn && userId) {
      return buildFallbackSummary(userId, role);
    }

    return { data: null, error };
  },
};
