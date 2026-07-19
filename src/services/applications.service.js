import { supabase } from '../config/supabase';
import { notificationsService } from './notifications.service';
import { rankApplicantsByJob } from '../utils/jobMatching';

const STATUS_NOTIFICATION_COPY = {
  viewed: {
    title: 'Tu aplicacion fue vista',
    body: (jobTitle) => `La empresa reviso tu aplicacion para "${jobTitle}".`,
  },
  contacted: {
    title: 'La empresa quiere contactarte',
    body: (jobTitle) => `Tu aplicacion para "${jobTitle}" avanzo a contacto.`,
  },
  accepted: {
    title: 'Aplicacion aceptada',
    body: (jobTitle) => `Buenas noticias. Tu aplicacion para "${jobTitle}" fue aceptada.`,
  },
  rejected: {
    title: 'Aplicacion no seleccionada',
    body: (jobTitle) => `Tu aplicacion para "${jobTitle}" no fue seleccionada esta vez.`,
  },
};

function mapApplicationError(error) {
  if (!error) return null;
  const message = error.message?.toLowerCase?.() || '';
  const code = error.code || '';

  if (code === '23505' || message.includes('duplicate key')) {
    return { ...error, message: 'Ya has aplicado a esta oferta.' };
  }

  if (message.includes('violates row-level security')) {
    return { ...error, message: 'No tienes permisos para realizar esta accion.' };
  }

  return { ...error, message: 'No se pudo completar la accion. Intentalo de nuevo.' };
}

export const applicationsService = {
  apply: async (data) => {
    const result = await supabase.from('applications').insert(data).select().single();
    return { ...result, error: mapApplicationError(result.error) };
  },

  getCandidateApplications: (candidateId) =>
    supabase
      .from('applications')
      .select('*, jobs(id, title, city, company_profiles(company_name, is_verified, verification_status))')
      .eq('candidate_id', candidateId)
      .order('applied_at', { ascending: false }),

  getJobApplicants: async (companyId) => {
    const applicationsResult = await supabase
      .from('applications')
      .select('*, jobs!inner(id, company_id, title, description, requirements, city, job_type, work_mode, salary, salary_negotiable, application_deadline, company_profiles(sector, country))')
      .eq('jobs.company_id', companyId)
      .order('applied_at', { ascending: false });

    if (applicationsResult.error || !applicationsResult.data?.length) {
      return applicationsResult;
    }

    const candidateIds = [
      ...new Set(applicationsResult.data.map((application) => application.candidate_id).filter(Boolean)),
    ];

    const profilesResult = await supabase
      .from('candidate_profiles')
      .select(
        'user_id, full_name, avatar_path, headline, about, city, country, years_experience, contact_email, contact_whatsapp, job_preferences, expected_salary, skills(name), experience(position), education(institution, program, grade), languages(language, level)',
      )
      .in('user_id', candidateIds);

    if (profilesResult.error) {
      return { ...applicationsResult, error: profilesResult.error };
    }

    const profilesById = new Map((profilesResult.data ?? []).map((profile) => [profile.user_id, profile]));
    const data = rankApplicantsByJob(
      applicationsResult.data
        .map((application) => ({
          ...application,
          candidate_profiles: profilesById.get(application.candidate_id),
        }))
        .filter((application) => application.candidate_profiles),
    );

    return { ...applicationsResult, data };
  },

  updateStatus: async (id, status) => {
    const result = await supabase
      .from('applications')
      .update({ status })
      .eq('id', id)
      .select('*, jobs(id, title)')
      .single();

    const copy = STATUS_NOTIFICATION_COPY[status];
    if (!result.error && copy && result.data?.candidate_id) {
      const jobTitle = result.data.jobs?.title || 'la oferta';
      await notificationsService.create({
        recipient_id: result.data.candidate_id,
        type: `application_${status}`,
        title: copy.title,
        body: copy.body(jobTitle),
        metadata: {
          application_id: id,
          job_id: result.data.job_id,
          link: '/personal/applications',
        },
      });
    }

    return { ...result, error: mapApplicationError(result.error) };
  },

  hasApplied: (candidateId, jobId) =>
    supabase
      .from('applications')
      .select('id, status')
      .eq('candidate_id', candidateId)
      .eq('job_id', jobId)
      .maybeSingle(),

  withdraw: async (id) => {
    const result = await supabase
      .from('applications')
      .update({ status: 'withdrawn' })
      .eq('id', id)
      .select()
      .single();

    return { ...result, error: mapApplicationError(result.error) };
  },

  reapply: async (id, data) => {
    const result = await supabase
      .from('applications')
      .update({ ...data, status: 'pending', applied_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { ...result, error: mapApplicationError(result.error) };
  },

  getCvPath: (applicationId) =>
    supabase.rpc('get_application_cv_path', { app_id: applicationId }),
};
