import { supabase } from '../config/supabase';
import { isEmployerRole, isPersonalRole } from '../constants/roles';
import { verificationService } from './verification.service';
import { profileService } from './profile.service';
import { companyService } from './company.service';

function roleRegistrationLabel(role) {
  if (isEmployerRole(role)) return 'empresa';
  if (isPersonalRole(role)) return 'candidato';
  return 'usuario';
}

export const adminService = {
  getDashboardStats: async () => {
    const { data, error } = await supabase.rpc('admin_dashboard_stats');
    if (error) return { data: null, error };

    return {
      data: {
        registeredUsers: data?.registered_users ?? 0,
        registeredCompanies: data?.registered_companies ?? 0,
        registeredOrganizations: data?.registered_organizations ?? 0,
        verifiedCompanies: data?.verified_companies ?? 0,
        pendingVerifications: data?.pending_verifications ?? 0,
        publications: data?.publications ?? 0,
        activeJobs: data?.active_jobs ?? 0,
        pendingReports: data?.pending_reports ?? 0,
      },
      error: null,
    };
  },

  getRecentUsers: async (limit = 5) => {
    const { data, error } = await supabase.rpc('admin_list_users');
    return { data: (data ?? []).slice(0, limit), error };
  },

  getRecentCompanies: (limit = 5) =>
    supabase
      .from('company_profiles')
      .select('user_id, company_name, city, is_verified, created_at, logo_path, is_active, company_size, company_type')
      .order('created_at', { ascending: false })
      .limit(limit),

  getRecentVerifications: (limit = 5) =>
    supabase
      .from('verification_requests')
      .select('*, company_profiles(company_name, company_size)')
      .order('created_at', { ascending: false })
      .limit(limit),

  getRecentReports: (limit = 5) =>
    supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit),

  getRecentActivity: async (limit = 8) => {
    const [users, companies, verifications, reports] = await Promise.all([
      supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .neq('role', 'admin')
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('company_profiles')
        .select('user_id, company_name, created_at')
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('verification_requests')
        .select('id, status, created_at, company_profiles(company_name)')
        .order('created_at', { ascending: false })
        .limit(3),
      supabase.from('reports').select('id, target_type, created_at').order('created_at', { ascending: false }).limit(3),
    ]);

    const items = [
      ...(users.data ?? []).map((item) => ({
        id: `user-${item.user_id}`,
        type: 'new_user',
        label: `Nuevo registro de ${roleRegistrationLabel(item.role)}`,
        created_at: item.created_at,
      })),
      ...(companies.data ?? []).map((item) => ({
        id: `company-${item.user_id}`,
        type: 'new_company',
        label: `Empresa registrada: ${item.company_name}`,
        created_at: item.created_at,
      })),
      ...(verifications.data ?? []).map((item) => ({
        id: `verification-${item.id}`,
        type: 'verification',
        label: `${item.company_profiles?.company_name ?? 'Empresa'} — ${item.status}`,
        created_at: item.created_at,
      })),
      ...(reports.data ?? []).map((item) => ({
        id: `report-${item.id}`,
        type: 'report',
        label: `Nuevo reporte (${item.target_type})`,
        created_at: item.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);

    return { data: items, error: users.error || companies.error || verifications.error || reports.error };
  },

  getUsers: () => supabase.rpc('admin_list_users'),

  // Fetches the extended profile for a single user so the admin can inspect it.
  // A missing profile row (user never completed setup) is NOT treated as an error:
  // we return { data: null, exists: false } so the UI can still show core data.
  getUserDetail: async (userId, role) => {
    const { data, error } = isEmployerRole(role)
      ? await companyService.getCompanyProfile(userId)
      : await profileService.getCandidateFullProfile(userId);

    if (error?.code === 'PGRST116') {
      return { data: null, error: null, exists: false };
    }

    return { data: data ?? null, error: error ?? null, exists: Boolean(data) };
  },

  setUserActive: (userId, role, isActive) =>
    supabase.rpc('admin_set_user_active', {
      p_user_id: userId,
      p_is_active: isActive,
    }),

  setUserRole: (userId, role) =>
    supabase.rpc('admin_set_user_role', {
      p_user_id: userId,
      p_role: role,
    }),

  updateUserProfile: (userId, values) =>
    supabase.rpc('admin_update_user_profile', {
      p_user_id: userId,
      p_full_name: values.full_name ?? null,
      p_company_name: values.company_name ?? null,
      p_city: values.city ?? null,
      p_contact_email: values.contact_email ?? null,
    }),

  deleteUser: (userId) =>
    supabase.rpc('admin_delete_user', {
      p_user_id: userId,
    }),

  getCompanies: () => adminService.getEmployers('business'),

  getOrganizations: () => adminService.getEmployers('organization'),

  getEmployers: (accountRole) =>
    supabase.rpc('admin_list_companies', {
      p_account_role: accountRole ?? null,
    }),

  manualVerifyCompany: (userId) =>
    supabase.rpc('admin_manual_verify_company', {
      p_user_id: userId,
    }),

  getAdmins: () => supabase.rpc('admin_list_admins'),

  isMyAccountActive: () => supabase.rpc('is_my_account_active'),

  setCompanyActive: (userId, isActive) =>
    supabase.rpc('admin_set_user_active', {
      p_user_id: userId,
      p_is_active: isActive,
    }),

  getAllVerifications: () =>
    supabase
      .from('verification_requests')
      .select('*, company_profiles(company_name, logo_path, is_verified, verification_status)')
      .order('created_at', { ascending: false }),

  getPendingVerifications: () => verificationService.getPendingRequests(),

  reviewVerification: (id, action, reviewNotes) =>
    verificationService.reviewRequest(id, action, reviewNotes),

  getVerificationDocumentUrl: (documentPath) =>
    verificationService.getSignedDocumentUrl(documentPath),

  getJobs: async () => {
    // OPTIMIZATION: Switched from two separate queries (jobs then applications) to a single query
    // that counts related applications directly in the database. This is more performant.
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*, company_profiles(company_name), applications_count:applications(count)')
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    return {
      data: (jobs ?? []).map((job) => ({
        ...job,
        // The count from Supabase is an array with one object: { count: N }
        applications_count: job.applications_count?.[0]?.count ?? 0,
      })),
      error: null,
    };
  },

  setJobModeration: (jobId, { hidden, status = null }) =>
    supabase.rpc('admin_set_job_moderation', {
      p_job_id: jobId,
      p_admin_hidden: hidden,
      p_status: status,
    }),

  setJobHidden: (jobId, hidden) =>
    adminService.setJobModeration(jobId, { hidden }),

  deleteJob: (jobId) =>
    adminService.setJobModeration(jobId, { hidden: true, status: 'closed' }),

  getPosts: async () => {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };
    if (!posts?.length) return { data: [], error: null };

    const postIds = posts.map((post) => post.id);
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('target_id')
      .eq('target_type', 'post')
      .in('target_id', postIds);

    if (reportsError) return { data: null, error: reportsError };

    const counts = (reports ?? []).reduce((acc, report) => {
      acc[report.target_id] = (acc[report.target_id] ?? 0) + 1;
      return acc;
    }, {});

    const authorIds = [...new Set(posts.map((post) => post.author_id))];
    const [candidates, companies] = await Promise.all([
      supabase.from('candidate_profiles').select('user_id, full_name, avatar_path').in('user_id', authorIds),
      supabase.from('company_profiles').select('user_id, company_name, logo_path').in('user_id', authorIds),
    ]);

    const authors = {};
    (candidates.data ?? []).forEach((profile) => {
      authors[profile.user_id] = { name: profile.full_name, avatar: profile.avatar_path, type: 'personal' };
    });
    (companies.data ?? []).forEach((profile) => {
      authors[profile.user_id] = { name: profile.company_name, avatar: profile.logo_path, type: 'business' };
    });

    return {
      data: posts.map((post) => ({
        ...post,
        author: authors[post.author_id] ?? { name: '', avatar: null, type: post.author_type },
        reports_count: counts[post.id] ?? 0,
      })),
      error: null,
    };
  },

  deletePost: (postId) =>
    supabase.rpc('admin_delete_post', {
      p_post_id: postId,
    }),

  setPostHidden: (postId, hidden) =>
    supabase.rpc('admin_set_post_hidden', {
      p_post_id: postId,
      p_is_hidden: hidden,
    }),

  hidePost: (postId) => adminService.setPostHidden(postId, true),

  getNewsArticles: () =>
    supabase
      .from('news_articles')
      .select('*')
      .order('published_at', { ascending: false }),

  createNewsArticle: (data) =>
    supabase.from('news_articles').insert(data).select().single(),

  updateNewsArticle: (id, data) =>
    supabase.from('news_articles').update(data).eq('id', id).select().single(),

  deleteNewsArticle: (id) => supabase.from('news_articles').delete().eq('id', id),

  setNewsActive: (id, isActive) =>
    supabase.from('news_articles').update({ is_active: isActive }).eq('id', id).select().single(),

  getFeedEvents: () =>
    supabase.from('feed_events').select('*').order('starts_at', { ascending: false }),

  createFeedEvent: (data) => supabase.from('feed_events').insert(data).select().single(),

  updateFeedEvent: (id, data) => supabase.from('feed_events').update(data).eq('id', id).select().single(),

  deleteFeedEvent: (id) => supabase.from('feed_events').delete().eq('id', id),

  setFeedEventActive: (id, isActive) =>
    supabase.from('feed_events').update({ is_active: isActive }).eq('id', id).select().single(),

  getFeedCourses: () =>
    supabase.from('feed_courses').select('*').order('created_at', { ascending: false }),

  createFeedCourse: (data) => supabase.from('feed_courses').insert(data).select().single(),

  updateFeedCourse: (id, data) => supabase.from('feed_courses').update(data).eq('id', id).select().single(),

  deleteFeedCourse: (id) => supabase.from('feed_courses').delete().eq('id', id),

  setFeedCourseActive: (id, isActive) =>
    supabase.from('feed_courses').update({ is_active: isActive }).eq('id', id).select().single(),

  getReports: async () => {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { data: null, error };
    if (!reports?.length) return { data: [], error: null };

    const profileIds = reports.filter((r) => r.target_type === 'profile').map((r) => r.target_id);
    const jobIds = reports.filter((r) => r.target_type === 'job').map((r) => r.target_id);
    const postIds = reports.filter((r) => r.target_type === 'post').map((r) => r.target_id);

    const [candidates, companies, jobs, posts] = await Promise.all([
      profileIds.length
        ? supabase.from('candidate_profiles').select('user_id, full_name').in('user_id', profileIds)
        : Promise.resolve({ data: [] }),
      profileIds.length
        ? supabase.from('company_profiles').select('user_id, company_name').in('user_id', profileIds)
        : Promise.resolve({ data: [] }),
      jobIds.length ? supabase.from('jobs').select('id, title').in('id', jobIds) : Promise.resolve({ data: [] }),
      postIds.length
        ? supabase.from('posts').select('id, content').in('id', postIds)
        : Promise.resolve({ data: [] }),
    ]);

    const labels = {};
    (candidates.data ?? []).forEach((p) => {
      labels[p.user_id] = `Candidato: ${p.full_name}`;
    });
    (companies.data ?? []).forEach((p) => {
      labels[p.user_id] = `Empresa: ${p.company_name}`;
    });
    (jobs.data ?? []).forEach((j) => {
      labels[j.id] = `Oferta: ${j.title}`;
    });
    (posts.data ?? []).forEach((p) => {
      labels[p.id] = `Publicación: ${(p.content ?? '').slice(0, 40)}`;
    });

    return {
      data: reports.map((report) => ({
        ...report,
        target_label: labels[report.target_id] ?? report.target_id,
      })),
      error: null,
    };
  },

  updateReportStatus: (reportId, status) =>
    supabase.from('reports').update({ status }).eq('id', reportId),

  deleteReport: (reportId) =>
    supabase.rpc('admin_delete_report', {
      p_report_id: reportId,
    }),

  getAdminNotifications: async () => {
    const [users, companies, verifications, reports] = await Promise.all([
      supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .neq('role', 'admin')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('company_profiles')
        .select('user_id, company_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('verification_requests')
        .select('id, status, created_at, company_profiles(company_name)')
        .order('created_at', { ascending: false })
        .limit(15),
      supabase.from('reports').select('id, target_type, created_at').order('created_at', { ascending: false }).limit(10),
    ]);

    const items = [
      ...(users.data ?? []).map((item) => ({
        id: `user-${item.user_id}`,
        title: 'Nuevo usuario',
        body: `Registro de ${roleRegistrationLabel(item.role)}`,
        created_at: item.created_at,
      })),
      ...(companies.data ?? []).map((item) => ({
        id: `company-${item.user_id}`,
        title: 'Nueva empresa',
        body: item.company_name,
        created_at: item.created_at,
      })),
      ...(verifications.data ?? []).map((item) => ({
        id: `verification-${item.id}`,
        title:
          item.status === 'pending'
            ? 'Verificación enviada'
            : item.status === 'approved'
              ? 'Verificación aprobada'
              : 'Verificación rechazada',
        body: item.company_profiles?.company_name ?? 'Empresa',
        created_at: item.created_at,
      })),
      ...(reports.data ?? []).map((item) => ({
        id: `report-${item.id}`,
        title: 'Nuevo reporte',
        body: `Tipo: ${item.target_type}`,
        created_at: item.created_at,
      })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      data: items,
      error: users.error || companies.error || verifications.error || reports.error,
    };
  },

  getPlatformSettings: () => supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle(),

  updatePlatformSettings: (settings) =>
    supabase
      .from('platform_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single(),

  getPushBroadcastHistory: async (limit = 50) => {
    const { data, error } = await supabase.rpc('admin_list_push_broadcast_log', {
      p_limit: limit,
    });
    return { data: data ?? [], error };
  },

  sendAdminPushBroadcast: async ({
    title,
    body,
    link = '/personal/notifications',
    audienceFilter = { all: true },
    scheduledAt = null,
  }) => {
    const { data, error } = await supabase.functions.invoke('send_push', {
      body: {
        admin_broadcast: true,
        title,
        body,
        audience_filter: audienceFilter,
        scheduled_at: scheduledAt,
        data: {
          type: 'admin_broadcast',
          link,
        },
      },
    });

    if (error) return { data: null, error };
    if (data?.error) return { data: null, error: new Error(String(data.error)) };
    return { data, error: null };
  },

  processScheduledPushNotifications: async () => {
    const { data, error } = await supabase.functions.invoke('send_push', {
      body: { process_scheduled: true },
    });
    if (error) return { data: null, error };
    if (data?.error) return { data: null, error: new Error(String(data.error)) };
    return { data, error: null };
  },

  listTopics: async () => {
    const { data, error } = await supabase.rpc('admin_list_topics');
    return { data: data ?? [], error };
  },

  createTopic: async (name) => {
    const { data, error } = await supabase.rpc('admin_create_topic', {
      p_name: name,
    });
    return { data, error };
  },

  updateTopic: async (topicId, { name = null, isActive = null } = {}) => {
    const { data, error } = await supabase.rpc('admin_update_topic', {
      p_topic_id: topicId,
      p_name: name,
      p_is_active: isActive,
    });
    return { data, error };
  },

  deactivateTopic: async (topicId) => {
    const { data, error } = await supabase.rpc('admin_deactivate_topic', {
      p_topic_id: topicId,
    });
    return { data, error };
  },

  deleteUnusedTopic: async (topicId) => {
    const { data, error } = await supabase.rpc('admin_delete_unused_topic', {
      p_topic_id: topicId,
    });
    return { data, error };
  },
};
