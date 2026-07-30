/** Coherent demo payload for employer dashboard preview mode. */

function daysAgo(n, hours = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

export function getPreviewCompanyDashboard(profile) {
  const companyName = profile?.company_name?.trim() || 'Tech Solutions Guinea';
  const chart_30d = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (29 - i));
    const wave = Math.round(8 + Math.sin(i / 3) * 5 + (i % 5));
    const apps = Math.max(0, Math.round(wave / 4) - (i % 3 === 0 ? 0 : 1));
    return {
      day: d.toISOString().slice(0, 10),
      views: wave + 4,
      applications: apps,
    };
  });

  return {
    company: {
      user_id: profile?.user_id,
      company_name: companyName,
      logo_path: profile?.logo_path ?? null,
      sector: profile?.sector || 'Tecnología',
      city: profile?.city || 'Malabo',
      is_verified: profile?.is_verified ?? false,
      verification_status: profile?.verification_status ?? 'not_submitted',
      company_type: profile?.company_type ?? 'business',
    },
    stats: {
      applications_total: 27,
      applications_week: 11,
      applications_prev_week: 9,
      applications_delta_pct: 18,
      views_total: 390,
      views_week: 86,
      views_prev_week: 80,
      views_delta_pct: 8,
      followers_total: 145,
      followers_week: 6,
      followers_prev_week: 5,
      followers_delta_pct: 2,
      interactions_total: 78,
      interactions_week: 18,
      interactions_prev_week: 16,
      interactions_delta_pct: 12,
      jobs_active: 3,
      jobs_total: 5,
      posts_total: 4,
      unread_notifications: 1,
      new_applications_today: 3,
      new_profile_visits_today: 2,
      new_notifications_today: 1,
    },
    jobs: [
      {
        id: 'preview-job-1',
        title: 'Desarrollador Flutter',
        status: 'active',
        created_at: daysAgo(12),
        city: 'Malabo',
        job_type: 'full-time',
        work_mode: 'hybrid',
        days_active: 12,
        views: 148,
        applications: 14,
      },
      {
        id: 'preview-job-2',
        title: 'Especialista en Marketing Digital',
        status: 'active',
        created_at: daysAgo(8),
        city: 'Bata',
        job_type: 'full-time',
        work_mode: 'on-site',
        days_active: 8,
        views: 97,
        applications: 8,
      },
      {
        id: 'preview-job-3',
        title: 'Asistente administrativo',
        status: 'active',
        created_at: daysAgo(5),
        city: 'Malabo',
        job_type: 'part-time',
        work_mode: 'on-site',
        days_active: 5,
        views: 64,
        applications: 5,
      },
    ],
    applicants: [
      {
        id: 'preview-app-1',
        user_id: 'preview-candidate-ana',
        job_id: 'preview-job-1',
        status: 'pending',
        funnel_status: 'pending',
        applied_at: daysAgo(0, 1),
        full_name: 'Ana Mengue',
        avatar_path: null,
        job_title: 'Desarrollador Flutter',
      },
      {
        id: 'preview-app-2',
        user_id: 'preview-candidate-carlos',
        job_id: 'preview-job-2',
        status: 'accepted',
        funnel_status: 'accepted',
        applied_at: daysAgo(1, 3),
        full_name: 'Carlos Ndong',
        avatar_path: null,
        job_title: 'Especialista en Marketing Digital',
      },
      {
        id: 'preview-app-3',
        user_id: 'preview-candidate-3',
        job_id: 'preview-job-1',
        status: 'rejected',
        funnel_status: 'rejected',
        applied_at: daysAgo(2),
        full_name: 'María Esono',
        avatar_path: null,
        job_title: 'Desarrollador Flutter',
      },
      {
        id: 'preview-app-4',
        user_id: 'preview-candidate-4',
        job_id: 'preview-job-3',
        status: 'viewed',
        funnel_status: 'pending',
        applied_at: daysAgo(3),
        full_name: 'Pablo Obiang',
        avatar_path: null,
        job_title: 'Asistente administrativo',
      },
    ],
    chart_30d,
    activity: [
      {
        id: 'act-1',
        type: 'application',
        at: daysAgo(0, 0.05),
        title: 'Nueva candidatura',
        detail: 'Ana Mengue aplicó a «Desarrollador Flutter»',
      },
      {
        id: 'act-2',
        type: 'follow',
        at: daysAgo(0, 0.33),
        title: 'Nuevo seguidor',
        detail: 'Juan comenzó a seguir la empresa',
      },
      {
        id: 'act-3',
        type: 'job_published',
        at: daysAgo(0, 1),
        title: 'Oferta publicada',
        detail: 'Oferta «Desarrollador Flutter» publicada',
      },
      {
        id: 'act-4',
        type: 'application',
        at: daysAgo(1),
        title: 'Nueva candidatura',
        detail: 'Carlos Ndong aplicó a «Especialista en Marketing Digital»',
      },
      {
        id: 'act-5',
        type: 'post',
        at: daysAgo(2),
        title: 'Publicación nueva',
        detail: 'Estamos buscando talento para nuestro equipo de producto',
      },
    ],
    generated_at: new Date().toISOString(),
    _source: 'preview',
  };
}
