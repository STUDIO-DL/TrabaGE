import { supabase } from '../config/supabase';
import { notificationsService } from './notifications.service';
import { jobRecommendationsService } from './jobRecommendations.service';
import { FOLLOWS_TARGET } from './follows.service';
import { getCompanyDisplayName } from '../utils/companyProfile';
import { reportError } from '../utils/logger';
import { enrichJobMatchingFields } from '../utils/inferJobMatchingFields';
import { JOB_SOURCE } from '../constants/jobSource';
import { storageService } from './storage.service';
import { versionedStoragePath } from '../utils/storagePaths';
import { STORAGE_BUCKETS } from '../constants/storage';

const ACTIVE_JOB_SELECT = [
  'id',
  'title',
  'role',
  'description',
  'requirements',
  'city',
  'country',
  'job_type',
  'work_mode',
  'salary',
  'salary_negotiable',
  'status',
  'created_at',
  'company_id',
  'application_deadline',
  'source_type',
  'shared_by_user_id',
  'contact_method',
  'image_path',
  'company_profiles(company_name, logo_path, verified_status, is_verified, verification_status, sector, country)',
  'publisher:candidate_profiles!jobs_shared_by_user_id_fkey(full_name, avatar_path)',
].join(', ');

function mapJobError(error) {
  if (!error) return null;

  const message = error.message?.toLowerCase?.() || '';

  if (message.includes('violates row-level security')) {
    return {
      ...error,
      message: 'No tienes permisos para modificar esta oferta.',
    };
  }

  if (message.includes('completa tu perfil')) {
    return {
      ...error,
      message:
        'Para publicar oportunidades de empleo primero debes completar tu perfil. Esto ayuda a generar confianza y mejora la calidad de las publicaciones.',
    };
  }

  if (message.includes('check constraint')) {
    return {
      ...error,
      message: 'Revisa los datos de la oferta antes de guardar.',
    };
  }

  if (message.includes('foreign key')) {
    return {
      ...error,
      message: 'No se encontró el perfil asociado.',
    };
  }

  return {
    ...error,
    message: 'No se pudo guardar la oferta. Inténtalo de nuevo.',
  };
}

function normalizeJobRows(rows) {
  return (rows ?? []).map((job) => ({
    ...job,
    applications_count:
      job.applications_count?.[0]?.count ?? job.applications_count ?? 0,
  }));
}

function extractSalaryNumber(value) {
  const numbers = String(value ?? '')
    .match(/\d[\d.,]*/g)
    ?.map((item) =>
      Number(
        item.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'),
      ),
    )
    .filter((item) => Number.isFinite(item));

  return numbers?.length ? Math.max(...numbers) : 0;
}

export const jobsService = {
  getActiveJobs: async (filters = {}) => {
    let query = supabase
      .from('jobs')
      .select(ACTIVE_JOB_SELECT)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (filters.city) {
      query = query.eq('city', filters.city);
    }

    if (filters.jobType) {
      query = query.eq('job_type', filters.jobType);
    }

    if (filters.workMode) {
      query = query.eq('work_mode', filters.workMode);
    }

    if (filters.sector) {
      query = query.eq('company_profiles.sector', filters.sector);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.sourceType) {
      query = query.eq('source_type', filters.sourceType);
    }

    if (filters.limit != null) {
      const limit = Math.min(
        Math.max(Number(filters.limit) || 40, 1),
        100,
      );

      const offset = Math.max(Number(filters.offset) || 0, 0);

      query = query.range(offset, offset + limit - 1);
    }

    const result = await query;

    if (!filters.salaryMin) {
      return result;
    }

    return {
      ...result,
      data: (result.data ?? []).filter(
        (job) =>
          job.salary_negotiable ||
          extractSalaryNumber(job.salary) >= Number(filters.salaryMin),
      ),
    };
  },

  getJobById: (id) =>
    supabase
      .from('jobs')
      .select(
        '*, company_profiles(*), publisher:candidate_profiles!jobs_shared_by_user_id_fkey(full_name, avatar_path, headline)',
      )
      .eq('id', id)
      .single(),

  getApplicationCount: (jobId) =>
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId),

  createJob: async (data) => {
    const payload = enrichJobMatchingFields({
      ...data,
      source_type: JOB_SOURCE.COMPANY,
      shared_by_user_id: null,
    });

    const result = await supabase
      .from('jobs')
      .insert(payload)
      .select()
      .single();

    return {
      ...result,
      error: mapJobError(result.error),
    };
  },

  /**
   * Personal-user shared opportunity.
   * Uses the existing jobs table and keeps the payload simpler
   * than company job offers.
   */
  createSharedOpportunity: async ({
    userId,
    title,
    description,
    requirements,
    city,
    contactMethod,
    imageFile,
  }) => {
    const basePayload = enrichJobMatchingFields({
      source_type: JOB_SOURCE.USER,
      shared_by_user_id: userId,
      company_id: null,
      title: String(title ?? '').trim(),
      description: String(description ?? '').trim() || null,
      requirements: String(requirements ?? '').trim() || null,
      city: String(city ?? '').trim() || null,
      contact_method: String(contactMethod ?? '').trim() || null,
      status: 'active',
      salary_negotiable: true,
    });

    const insertResult = await supabase
      .from('jobs')
      .insert(basePayload)
      .select()
      .single();

    if (insertResult.error) {
      return {
        ...insertResult,
        error: mapJobError(insertResult.error),
      };
    }

    let job = insertResult.data;

    if (imageFile && job?.id) {
      const upload = await storageService.uploadJobOpportunityImage(
        userId,
        job.id,
        imageFile,
      );

      if (!upload.error) {
        const imagePath = versionedStoragePath(
          upload.path,
          STORAGE_BUCKETS.POST_IMAGES,
        );

        const updateResult = await supabase
          .from('jobs')
          .update({ image_path: imagePath })
          .eq('id', job.id)
          .select()
          .single();

        if (!updateResult.error) {
          job = updateResult.data;
        }
      }
    }

    return {
      data: job,
      error: null,
    };
  },

  getUserSharedOpportunities: async (userId, options = {}) => {
    let query = supabase
      .from('jobs')
      .select(ACTIVE_JOB_SELECT)
      .eq('source_type', JOB_SOURCE.USER)
      .eq('shared_by_user_id', userId)
      .order('created_at', { ascending: false });

    if (options.limit != null) {
      const safeLimit = Math.min(
        Math.max(Number(options.limit) || 50, 1),
        100,
      );

      const safeOffset = Math.max(Number(options.offset) || 0, 0);

      query = query.range(
        safeOffset,
        safeOffset + safeLimit - 1,
      );
    }

    return query;
  },

  updateJob: async (id, data) => {
    const shouldEnrich = [
      'title',
      'role',
      'description',
      'requirements',
    ].some((key) => key in data);

    const payload = shouldEnrich
      ? enrichJobMatchingFields(data)
      : data;

    const result = await supabase
      .from('jobs')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    return {
      ...result,
      error: mapJobError(result.error),
    };
  },

  getCompanyJobs: async (companyId, options = {}) => {
    let query = supabase
      .from('jobs')
      .select(
        'id, title, role, description, requirements, city, country, job_type, work_mode, salary, salary_negotiable, status, created_at, company_id, application_deadline, source_type, applications_count:applications(count)',
      )
      .eq('company_id', companyId)
      .eq('source_type', JOB_SOURCE.COMPANY)
      .order('created_at', { ascending: false });

    if (options.limit != null) {
      const safeLimit = Math.min(
        Math.max(Number(options.limit) || 50, 1),
        100,
      );

      const safeOffset = Math.max(Number(options.offset) || 0, 0);

      query = query.range(
        safeOffset,
        safeOffset + safeLimit - 1,
      );
    }

    const result = await query;

    return {
      ...result,
      data: normalizeJobRows(result.data),
    };
  },

  deleteJob: async (id) => {
    const result = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    return {
      ...result,
      error: mapJobError(result.error),
    };
  },

  updateJobStatus: (id, status) =>
    jobsService.updateJob(id, { status }),

  notifyJobPublished: async (job) => {
    if (!job?.id || !job.company_id) {
      return { error: null };
    }

    if (job.source_type === JOB_SOURCE.USER) {
      return { error: null };
    }

    const { data: companyProfile } = await supabase
      .from('company_profiles')
      .select('company_name')
      .eq('user_id', job.company_id)
      .maybeSingle();

    const companyName = getCompanyDisplayName(
      companyProfile,
      { warnIfMissing: true },
    );

    const citySuffix = job.city ? ` - ${job.city}` : '';

    const notifyResult =
      await notificationsService.notifyFollowers({
        targetType: FOLLOWS_TARGET.BUSINESS,
        targetId: job.company_id,
        type: 'new_job',
        title: companyName
          ? `Nueva oferta de ${companyName}`
          : 'Nueva oferta publicada',
        message: `${job.title}${citySuffix}`,
        link: `/personal/jobs/${job.id}`,
      });

    jobRecommendationsService
      .processNewJob(job)
      .catch((error) => {
        reportError(error, {
          area: 'job_publish_recommendations',
          jobId: job.id,
        });
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
    delete copy.publisher;
    delete copy.admin_hidden;
    delete copy.fts;
    delete copy.image_path;

    return jobsService.createJob({
      ...copy,
      source_type: JOB_SOURCE.COMPANY,
      shared_by_user_id: null,
      title: `Copia de ${job.title}`,
      status: 'draft',
    });
  },

  getSavedJobs: (userId) =>
    supabase
      .from('saved_jobs')
      .select(
        'id, created_at, jobs(*, company_profiles(company_name, logo_path, verified_status, is_verified, verification_status, sector, country), publisher:candidate_profiles!jobs_shared_by_user_id_fkey(full_name, avatar_path))',
      )
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
      .upsert(
        {
          user_id: userId,
          job_id: jobId,
        },
        {
          onConflict: 'user_id,job_id',
        },
      )
      .select('id')
      .single(),

  removeSavedJob: (userId, jobId) =>
    supabase
      .from('saved_jobs')
      .delete()
      .eq('user_id', userId)
      .eq('job_id', jobId),
};
