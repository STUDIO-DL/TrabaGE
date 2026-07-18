import { supabase } from '../config/supabase';
import { notificationsService } from './notifications.service';
import { jobRecommendationsService } from './jobRecommendations.service';
import { FOLLOWS_TARGET } from './follows.service';
import { getCompanyDisplayName } from '../utils/companyProfile';
import { reportError } from '../utils/logger';
import { enrichJobMatchingFields } from '../utils/inferJobMatchingFields';

function mapJobError(error) {
  if (!error) return null;
  const message = error.message?.toLowerCase?.() || '';

  if (message.includes('violates row-level security')) {
    return { ...error, message: 'No tienes permisos para modificar esta oferta.' };
  }
  if (message.includes('check constraint')) {
    return { ...error, message: 'Revisa los datos de la oferta antes de guardar.' };
  }
  if (message.includes('foreign key')) {
    return { ...error, message: 'No se encontró el perfil de empresa asociado.' };
  }

  return { ...error, message: 'No se pudo guardar la oferta. Inténtalo de nuevo.' };
}

function normalizeJobRows(rows) {
  return (rows ?? []).map((job) => ({
    ...job,
    applications_count: job.applications_count?.[0]?.count ?? job.applications_count ?? 0,
  }));
}

function extractSalaryNumber(value) {
  const numbers = String(value ?? '')
    .match(/\d[\d.,]*/g)
    ?.map((item) => Number(item.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')))
    .filter((item) => Number.isFinite(item));

  return numbers?.length ? Math.max(...numbers) : 0;
}

export const jobsService = {
  getActiveJobs: async (filters = {}) => {
    let query = supabase
      .from('jobs')
      .select('*, company_profiles!inner(company_name, logo_path, verified_status, is_verified, verification_status, sector, country)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (filters.city) query = query.eq('city', filters.city);
    if (filters.jobType) query = query.eq('job_type', filters.jobType);
    if (filters.workMode) query = query.eq('work_mode', filters.workMode);
    if (filters.sector) query = query.eq('company_profiles.sector', filters.sector);
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);

    const result = await query;
    if (!filters.salaryMin) return result;

    return {
      ...result,
      data: (result.data ?? []).filter((job) => (
        job.salary_negotiable || extractSalaryNumber(job.salary) >= Number(filters.salaryMin)
      )),
    };
  },

  getJobById: (id) =>
    supabase
      .from('jobs')
      .select('*, company_profiles(*)')
      .eq('id', id)
      .single(),

  getApplicationCount: (jobId) =>
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId),

  createJob: async (data) => {
    const payload = enrichJobMatchingFields(data);
    const result = await supabase.from('jobs').insert(payload).select().single();
    return { ...result, error: mapJobError(result.error) };
  },

  updateJob: async (id, data) => {
    const shouldEnrich = ['title', 'role', 'description', 'requirements'].some((key) => key in data);
    const payload = shouldEnrich ? enrichJobMatchingFields(data) : data;
    const result = await supabase.from('jobs').update(payload).eq('id', id).select().single();
    return { ...result, error: mapJobError(result.error) };
  },

  getCompanyJobs: async (companyId) => {
    const result = await supabase
      .from('jobs')
      .select('*, applications_count:applications(count)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    return { ...result, data: normalizeJobRows(result.data) };
  },

  deleteJob: async (id) => {
    const result = await supabase.from('jobs').delete().eq('id', id);
    return { ...result, error: mapJobError(result.error) };
  },

  updateJobStatus: (id, status) =>
    jobsService.updateJob(id, { status }),

  notifyJobPublished: async (job) => {
    if (!job?.id || !job.company_id) return { error: null };

    const { data: companyProfile } = await supabase
      .from('company_profiles')
      .select('company_name')
      .eq('user_id', job.company_id)
      .maybeSingle();

    const companyName = getCompanyDisplayName(companyProfile, { warnIfMissing: true });
    const citySuffix = job.city ? ` - ${job.city}` : '';

    const notifyResult = await notificationsService.notifyFollowers({
      targetType: FOLLOWS_TARGET.BUSINESS,
      targetId: job.company_id,
      type: 'new_job',
      title: companyName ? `Nueva oferta de ${companyName}` : 'Nueva oferta publicada',
      message: `${job.title}${citySuffix}`,
      link: `/personal/jobs/${job.id}`,
    });

    jobRecommendationsService.processNewJob(job).catch((error) => {
      reportError(error, { area: 'job_publish_recommendations', jobId: job.id });
    });

    return notifyResult;
  },

  duplicateJob: async (job) => {
    const copy = { ...job };
    delete copy.id;
    delete copy.created_at;
    delete copy.updated_at;
    delete copy.applications_count;
    delete copy.company_profiles;
    delete copy.admin_hidden;
    delete copy.fts;

    return jobsService.createJob({
      ...copy,
      title: `Copia de ${job.title}`,
      status: 'draft',
    });
  },

  getSavedJobs: (userId) =>
    supabase
      .from('saved_jobs')
      .select('id, created_at, jobs(*, company_profiles(company_name, logo_path, verified_status, is_verified, verification_status, sector, country))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

  getSavedJobIds: (userId) =>
    supabase
      .from('saved_jobs')
      .select('job_id')
      .eq('user_id', userId),

  saveJob: (userId, jobId) =>
    supabase
      .from('saved_jobs')
      .upsert({ user_id: userId, job_id: jobId }, { onConflict: 'user_id,job_id' })
      .select('id')
      .single(),

  removeSavedJob: (userId, jobId) =>
    supabase
      .from('saved_jobs')
      .delete()
      .eq('user_id', userId)
      .eq('job_id', jobId),
};
