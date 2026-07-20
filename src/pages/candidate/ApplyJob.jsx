import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import FormPageLayout from '../../components/layout/FormPageLayout';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useJob } from '../../hooks/useJobs';
import { useProfile } from '../../hooks/useProfile';
import { useCandidateProfile } from '../../hooks/useCandidateProfile';
import { applicationsService } from '../../services/applications.service';
import { notificationsService } from '../../services/notifications.service';
import { analyticsService } from '../../services/analytics.service';
import { cvPath } from '../../constants/storage';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';
import { FormPageSkeleton } from '../../components/common/Skeleton';
import { authService } from '../../services/auth.service';
import { ROLES, normalizeRole, rolePath } from '../../constants/roles';
import ApplyJobSummary from '../../components/apply/ApplyJobSummary';
import ApplyCvSelector from '../../components/apply/ApplyCvSelector';
import ApplyCoverLetter from '../../components/apply/ApplyCoverLetter';
import ApplyPreviewCard from '../../components/apply/ApplyPreviewCard';
import ApplySuccessState from '../../components/apply/ApplySuccessState';
import ApplyCustomQuestions from '../../components/apply/ApplyCustomQuestions';

function parseCustomQuestions(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ApplyJob() {
  const { id: jobId } = useParams();
  const navigate = useNavigate();
  const { user, isPreviewMode } = useAuth();
  const { profile } = useProfile();
  const { uploadCV } = useCandidateProfile();
  const { job, loading: jobLoading } = useJob(jobId);

  const [cvFile, setCvFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [cvUploading, setCvUploading] = useState(false);
  const [error, setError] = useState('');
  const [existingApplication, setExistingApplication] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const customQuestions = parseCustomQuestions(job?.custom_questions);
  const hasSavedCv = Boolean(
    profile?.cv_path && user?.id && profile.cv_path.startsWith(`${user.id}/`),
  );
  const hasActiveApplication =
    existingApplication?.status && existingApplication.status !== 'withdrawn';
  const selectedCvName = cvFile?.name ?? profile?.cv_name ?? null;
  const hasCvReady = hasSavedCv || Boolean(cvFile);
  const hasCoverLetter = Boolean(coverLetter.trim());

  useEffect(() => {
    if (isPreviewMode) {
      navigate('/login', { replace: true });
    }
  }, [isPreviewMode, navigate]);

  useEffect(() => {
    if (!user?.id || !jobId || isPreviewMode) return;

    applicationsService.hasApplied(user.id, jobId).then(({ data }) => {
      setExistingApplication(data);
    });
  }, [isPreviewMode, jobId, user?.id]);

  useEffect(() => {
    if (profile?.cover_letter && !coverLetter) {
      setCoverLetter(profile.cover_letter);
    }
  }, [profile?.cover_letter, coverLetter]);

  const resolveCvForSubmit = async () => {
    if (cvFile) {
      setCvUploading(true);
      const { error: uploadError } = await uploadCV(cvFile);
      setCvUploading(false);

      if (uploadError) {
        throw new Error(
          getSupabaseErrorMessage(uploadError, 'No se pudo subir el CV. Inténtalo de nuevo.'),
        );
      }

      return {
        cvPath: cvPath(user.id),
        cvName: cvFile.name,
      };
    }

    if (hasSavedCv) {
      return {
        cvPath: profile.cv_path,
        cvName: profile.cv_name || 'cv.pdf',
      };
    }

    throw new Error('Sube tu CV en PDF para enviar la solicitud.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isPreviewMode) {
      setError(GUEST_MODE_MESSAGE);
      return;
    }

    if (hasActiveApplication) {
      setError('Ya has enviado una solicitud para esta oferta.');
      return;
    }

    const fullName = profile?.full_name?.trim();
    if (!fullName) {
      setError('Completa tu nombre en el perfil antes de aplicar.');
      return;
    }

    if (!hasCvReady) {
      setError('Sube tu CV en PDF para enviar la solicitud.');
      return;
    }

    for (const question of customQuestions) {
      if (question.required && !answers[question.id]?.trim()) {
        setError(`Responde la pregunta: ${question.question}`);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const { cvPath, cvName } = await resolveCvForSubmit();

      const customAnswers = customQuestions.reduce((acc, q) => {
        if (answers[q.id]?.trim()) acc[q.id] = answers[q.id].trim();
        return acc;
      }, {});

      const notes = coverLetter.trim();

      const applicationPayload = {
        candidate_id: user.id,
        job_id: jobId,
        cv_path: cvPath,
        cv_name: cvName,
        full_name: fullName,
        additional_notes: notes || null,
        custom_answers: Object.keys(customAnswers).length ? customAnswers : null,
      };

      const { error: applyError } =
        existingApplication?.status === 'withdrawn'
          ? await applicationsService.reapply(existingApplication.id, applicationPayload)
          : await applicationsService.apply(applicationPayload);

      if (applyError) {
        setError(getSupabaseErrorMessage(applyError));
        setLoading(false);
        return;
      }

      analyticsService.trackApplicationSubmitted(user.id, jobId, { source: 'apply_form' });

      if (job?.company_id) {
        const notificationTitle = 'Nueva candidatura recibida';
        const notificationBody = `${fullName} aplicó a "${job.title}".`;
        const { data: roleData } = await authService.getUserRole(job.company_id);
        const employerRole =
          normalizeRole(roleData?.role, { companyType: job.company_profiles?.company_type }) ??
          ROLES.BUSINESS;
        const applicantsLink = rolePath(employerRole, '/applicants');

        await notificationsService.notifyUser({
          recipientId: job.company_id,
          type: 'new_application',
          title: notificationTitle,
          body: notificationBody,
          metadata: {
            job_id: jobId,
            candidate_id: user.id,
            actor_id: user.id,
            actor_type: 'personal',
            link: applicantsLink,
          },
        });
      }

      setSubmitted(true);
    } catch (submitError) {
      setError(submitError.message || 'No se pudo enviar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  if (jobLoading) {
    return (
      <PageContainer title="Enviar solicitud" backButton bottomNav={false}>
        <FormPageSkeleton fields={4} />
      </PageContainer>
    );
  }

  if (!job) {
    return (
      <PageContainer title="Enviar solicitud" backButton bottomNav={false}>
        <p className="p-space-base text-body-small text-app-muted">
          Oferta no encontrada o no disponible.
        </p>
      </PageContainer>
    );
  }

  if (submitted) {
    return (
      <FormPageLayout title="Enviar solicitud" backButton={false} contentClassName="flex flex-col">
        <ApplySuccessState onViewApplications={() => navigate('/personal/applications', { replace: true })} />
      </FormPageLayout>
    );
  }

  return (
    <FormPageLayout
      title="Enviar solicitud"
      backButton
      footer={
        <div className="space-y-space-sm">
          {error ? (
            <p className="text-caption text-error-600" role="alert">
              {error}
            </p>
          ) : null}
          {hasActiveApplication ? (
            <p className="text-caption text-app-muted" role="status">
              Ya has enviado una solicitud para esta oferta.
            </p>
          ) : null}
          <Button
            type="submit"
            form="apply-job-form"
            fullWidth
            loading={loading || cvUploading}
            disabled={hasActiveApplication || !hasCvReady}
          >
            Enviar solicitud
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={loading}
            onClick={() => navigate(-1)}
          >
            Cancelar
          </Button>
        </div>
      }
    >
      <form id="apply-job-form" onSubmit={handleSubmit} className="space-y-space-md p-space-base pb-space-xl">
        <ApplyJobSummary job={job} />

        <ApplyCvSelector
          cvName={profile?.cv_name}
          hasSavedCv={hasSavedCv}
          pendingFile={cvFile}
          uploading={cvUploading}
          onSelectFile={setCvFile}
          onUploadError={(message) => {
            if (message) setError(message);
            else setError('');
          }}
        />

        <ApplyCoverLetter value={coverLetter} onChange={setCoverLetter} />

        <ApplyCustomQuestions
          questions={customQuestions}
          answers={answers}
          onChange={setAnswers}
        />

        <ApplyPreviewCard cvName={selectedCvName} hasCoverLetter={hasCoverLetter} />
      </form>
    </FormPageLayout>
  );
}
