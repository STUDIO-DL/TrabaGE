import { supabase } from '../config/supabase';
import { verificationService } from './verification.service';
import { profileService } from './profile.service';
import { companyService } from './company.service';

export const adminService = {
  getDashboardStats: async () => {
    const [
      usersRes,
      companiesRes,
      verificationsRes,
      jobsRes,
      postsRes,
    ] = await Promise.all([
      supabase.from('user_roles').select('user_id', { count: 'exact', head: true }).neq('role', 'admin'),
      supabase.from('company_profiles').select('user_id', { count: 'exact', head: true }),
      supabase
        .from('verification_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('admin_hidden', false),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('is_hidden', false),
    ]);

    return {
      data: {
        totalUsers: usersRes.count ?? 0,
        totalCompanies: companiesRes.count ?? 0,
        pendingVerifications: verificationsRes.count ?? 0,
        activeJobs: jobsRes.count ?? 0,
        totalPosts: postsRes.count ?? 0,
      },
      error: usersRes.error || companiesRes.error || verificationsRes.error || jobsRes.error || postsRes.error,
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
        label: `Nuevo ${item.role === 'company' ? 'registro de empresa' : 'candidato'}`,
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
    const { data, error } =
      role === 'company'
        ? await companyService.getCompanyProfile(userId)
        : await profileService.getCandidateFullProfile(userId);

    if (error?.code === 'PGRST116') {
      return { data: null, error: null, exists: false };
    }

    return { data: data ?? null, error: error ?? null, exists: Boolean(data) };
  },

  setUserActive: async (userId, role, isActive) => {
    const table = role === 'company' ? 'company_profiles' : 'candidate_profiles';
    return supabase.from(table).update({ is_active: isActive }).eq('user_id', userId);
  },

  getCompanies: () =>
    supabase
      .from('company_profiles')
      .select('user_id, company_name, city, is_verified, created_at, logo_path, is_active, verification_status, company_size, company_type')
      .order('created_at', { ascending: false }),

  setCompanyActive: (userId, isActive) =>
    supabase.from('company_profiles').update({ is_active: isActive }).eq('user_id', userId),

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

  setJobHidden: (jobId, hidden) =>
    supabase.from('jobs').update({ admin_hidden: hidden }).eq('id', jobId),

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
      authors[profile.user_id] = { name: profile.full_name, avatar: profile.avatar_path, type: 'candidate' };
    });
    (companies.data ?? []).forEach((profile) => {
      authors[profile.user_id] = { name: profile.company_name, avatar: profile.logo_path, type: 'company' };
    });

    return {
      data: posts.map((post) => ({
        ...post,
        author: authors[post.author_id] ?? { name: 'Usuario', avatar: null, type: post.author_type },
        reports_count: counts[post.id] ?? 0,
      })),
      error: null,
    };
  },

  deletePost: (postId) => supabase.from('posts').delete().eq('id', postId),

  hidePost: (postId) => supabase.from('posts').update({ is_hidden: true }).eq('id', postId),

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
        body: `Registro de ${item.role === 'company' ? 'empresa' : 'candidato'}`,
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
};
