import { supabase } from '../config/supabase';
import { notificationsService } from './notifications.service';
import { jobRecommendationsService } from './jobRecommendations.service';
import { FOLLOWS_TARGET } from './follows.service';
import { getCompanyDisplayName } from '../utils/companyProfile';
import { reportError } from '../utils/logger';
import { enrichJobMatchingFields } from '../utils/inferJobMatchingFields';
import { JOB_SOURCE } from '../constants/jobSource';

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
].join(', ');

function isSchemaColumnError(error) {
  const message = String(error?.message ?? '').toLowerCase();
  return (
    ['PGRST204', '42703'].includes(error?.code) ||
    message.includes('schema cache') ||
    message.includes('could not find') ||
    message.includes('column')
  );
}

function appendApplicationUrlToContact(contactMethod, applicationUrl) {
  const contact = String(contactMethod ?? '').trim();
  const url = String(applicationUrl ?? '').trim();

  if (!url) return contact || null;
  if (contact.toLowerCase().includes(url.toLowerCase())) return contact;

  return [contact, `Enlace: ${url}`].filter(Boolean).join('\n');
}

function createJobId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === 'x' ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  return '10000000-1000-4000-8000-100000000000'.replace(
    /[018]/g,
    (character) =>
      (
        Number(character) ^
        (crypto.getRandomValues(new Uint8Array(1))[0] &
          (15 >> (Number(character) / 4)))
      ).toString(16),
  );
}

async function attachPublishersToJobs(jobs) {
  if (!jobs?.length) return { data: jobs ?? [], error: null };

  const sharedUserIds = [
    ...new Set(
      jobs
        .filter(
          (job) =>
            job.source_type === JOB_SOURCE.USER && job.shared_by_user_id,
        )
        .map((job) => job.shared_by_user_id),
    ),
  ];

  if (!sharedUserIds.length) {
    return { data: jobs, error: null };
  }

  const { data: publishers, error } = await supabase
    .from('candidate_profiles_public')
    .select('user_id, full_name, avatar_path, headline')
    .in('user_id', sharedUserIds);

  if (error) {
    reportError(error, {
      area: 'shared_opportunity_public_publishers_batch',
      sharedUserIds,
    });
  }

  const publisherByUserId = Object.fromEntries(
    (publishers ?? []).map((publisher) => [publisher.user_id, publisher]),
  );

  return {
    data: jobs.map((job) => {
      if (job.source_type !== JOB_SOURCE.USER || !job.shared_by_user_id) {
        return job;
      }

      return {
        ...job,
        publisher: publisherByUserId[job.shared_by_user_id] ?? null,
        company_profiles: null,
      };
    }),
    error: null,
  };
}

async function attachJobProfiles(job) {
  if (!job) return { data: job, error: null };

  if (job.source_type === JOB_SOURCE.USER && job.shared_by_user_id) {
    const { data: publisher, error } = await supabase
      .from('candidate_profiles_public')
      .select('user_id, full_name, avatar_path, headline')
      .eq('user_id', job.shared_by_user_id)
      .maybeSingle();

    if (error) {
      reportError(error, {
        area: 'shared_opportunity_public_publisher',
        jobId: job.id,
        sharedByUserId: job.shared_by_user_id,
      });

      return {
        data: {
          ...job,
          publisher: null,
          company_profiles: null,
        },
        error: null,
      };
    }

    return {
      data: {
        ...job,
        publisher: publisher ?? null,
        company_profiles: null,
      },
      error: null,
    };
  }

  if (job.company_profiles !== undefined) {
    return { data: job, error: null };
  }

  if (job.company_id) {
    const { data: company, error } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', job.company_id)
      .maybeSingle();

    if (error) {
      return { data: null, error };
    }

    return {
      data: {
        ...job,
        company_profiles: company ?? null,
      },
      error: null,
    };
  }

  return { data: job, error: null };
}

function mapJobError(error) {
  if (!error) return null;

  const message = error.message?.toLowerCase?.() || '';

  if (message.includes('rate limit')) {
    return {
      ...error,
      message:
        'Has alcanzado el límite de publicaciones. Inténtalo de nuevo más tarde.',
    };
  }

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

    if (result.error) {
      return result;
    }

    const withPublishers = await attachPublishersToJobs(result.data ?? []);

    if (withPublishers.error) {
      return { ...result, data: null, error: withPublishers.error };
    }

    const jobs = withPublishers.data ?? [];

    if (!filters.salaryMin) {
      return { ...result, data: jobs };
    }

    return {
      ...result,
      data: jobs.filter(
        (job) =>
          job.salary_negotiable ||
          extractSalaryNumber(job.salary) >= Number(filters.salaryMin),
      ),
    };
  },

  getJobById: async (id) => {
    const result = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (result.error || !result.data) return result;

    const profiles = await attachJobProfiles(result.data);

    return {
      ...result,
      data: profiles.data,
      error: profiles.error,
    };
  },

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
    applicationUrl,
    salary,
    salaryNegotiable = false,
  }) => {
    const normalizedApplicationUrl =
      String(applicationUrl ?? '').trim() || null;

    const contactMethodWithUrl = appendApplicationUrlToContact(
      contactMethod,
      normalizedApplicationUrl,
    );

    const minimalPayload = {
      id: createJobId(),
      source_type: JOB_SOURCE.USER,
      shared_by_user_id: userId,
      company_id: null,
      title: String(title ?? '').trim(),
      description: String(description ?? '').trim() || null,
      requirements: String(requirements ?? '').trim() || null,
      city: String(city ?? '').trim() || null,
      contact_method: contactMethodWithUrl,
      salary: String(salary ?? '').trim() || null,
      salary_negotiable: Boolean(salaryNegotiable),
      status: 'active',
    };

    let insertResult = await supabase
      .from('jobs')
      .insert(minimalPayload);

    let savedPayload = minimalPayload;

    if (isSchemaColumnError(insertResult.error)) {
      const fallbackPayload = enrichJobMatchingFields({
        ...minimalPayload,
        salary_negotiable: true,
      });

      insertResult = await supabase
        .from('jobs')
        .insert(fallbackPayload);

      savedPayload = fallbackPayload;
    }

    if (insertResult.error) {
      return {
        ...insertResult,
        error: mapJobError(insertResult.error),
      };
    }

    return {
      data: savedPayload,
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

    const result = await query;

    if (result.error) {
      return result;
    }

    const withPublishers = await attachPublishersToJobs(result.data ?? []);

    return {
      ...result,
      data: withPublishers.data,
      error: withPublishers.error ?? result.error,
    };
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
