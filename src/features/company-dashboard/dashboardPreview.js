/**
 * Guest/demo payload for the employer dashboard.
 * Interface-only: no fake company names, people, jobs, or activity counts.
 */

export function getPreviewCompanyDashboard(profile) {
  return {
    company: {
      user_id: profile?.user_id,
      company_name: '',
      logo_path: null,
      sector: null,
      city: null,
      is_verified: false,
      verification_status: 'not_submitted',
      company_type: profile?.company_type ?? 'business',
    },
    stats: {
      applications_total: null,
      applications_week: 0,
      applications_prev_week: 0,
      applications_delta_pct: null,
      views_total: null,
      views_week: 0,
      views_prev_week: 0,
      views_delta_pct: null,
      followers_total: null,
      followers_week: 0,
      followers_prev_week: 0,
      followers_delta_pct: null,
      interactions_total: null,
      interactions_week: 0,
      interactions_prev_week: 0,
      interactions_delta_pct: null,
      jobs_active: 0,
      jobs_total: 0,
      posts_total: 0,
      unread_notifications: 0,
      new_applications_today: 0,
      new_profile_visits_today: 0,
      new_notifications_today: 0,
    },
    jobs: [],
    applicants: [],
    chart_30d: [],
    activity: [],
    generated_at: new Date().toISOString(),
    _source: 'preview',
  };
}
