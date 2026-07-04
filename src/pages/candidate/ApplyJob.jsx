import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import FormPageLayout from '../../components/layout/FormPageLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import FileUpload from '../../components/ui/FileUpload';
import Card from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useJob } from '../../hooks/useJobs';
import { useProfile } from '../../hooks/useProfile';
import { useNotificationContext } from '../../context/NotificationContext';
import { applicationsService } from '../../services/applications.service';
import { storageService } from '../../services/storage.service';
import { profileService } from '../../services/profile.service';
import { notificationsService } from '../../services/notifications.service';
import { analyticsService } from '../../services/analytics.service';
import { cvPath } from '../../constants/storage';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import { FILE_HINTS, validateFile } from '../../utils/validateFile';
import { getSupabaseErrorMessage } from '../../utils/supabaseErrors';

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
  const { job, loading: jobLoading } = useJob(jobId);
  const { showToast } = useNotificationContext();

  const [cvMode, setCvMode] = useState('saved');
  const [cvFile, setCvFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingApplication, setExistingApplication] = useState(null);

  const customQuestions = parseCustomQuestions(job?.custom_questions);
  const hasSavedCv = Boolean(profile?.cv_path && user?.id && profile.cv_path.startsWith(`${user.id}/`));
  const hasActiveApplication = existingApplication?.status && existingApplication.status !== 'withdrawn';

  useEffect(() => {
    if (isPreviewMode) {
      navigate('/login', { replace: true });
    }
  }, [isPreviewMode, navigate]);

  useEffect(() => {
    if (!hasSavedCv) setCvMode('upload');
  }, [hasSavedCv]);

  useEffect(() => {
    if (!user?.id || !jobId || isPreviewMode) return;

    applicationsService.hasApplied(user.id, jobId).then(({ data }) => {
      setExistingApplication(data);
      if (data?.status && data.status !== 'withdrawn') {
        setError('Ya has aplicado a esta oferta. Puedes revisar el estado en Mis aplicaciones.');
      }
    });
  }, [isPreviewMode, jobId, user?.id]);

  useEffect(() => {
    if (profile?.full_name && !answers.full_name) {
      setAnswers((prev) => ({ ...prev, full_name: profile.full_name }));
    }
  }, [profile?.full_name, answers.full_name]);

  useEffect(() => {
    if (profile?.cover_letter && !coverLetter) {
      setCoverLetter(profile.cover_letter);
    }
  }, [profile?.cover_letter, coverLetter]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isPreviewMode) {
      setError(GUEST_MODE_MESSAGE);
      return;
    }

    const fullName = profile?.full_name?.trim();
    if (!fullName) {
      setError('Completa tu nombre en el perfil antes de aplicar.');
      return;
    }

    let applicationCvPath = null;
    let cvName = null;

    if (cvMode === 'saved' && hasSavedCv) {
      applicationCvPath = profile.cv_path;
      cvName = profile.cv_name || 'cv.pdf';
    } else if (cvFile) {
      const validation = validateFile(cvFile, 'cv');
      if (!validation.valid) {
        setError(validation.error);
        return;
      }

      const path = cvPath(user.id);
      const { error: uploadError } = await storageService.uploadCV(
        user.id,
        cvFile,
        profile?.cv_path,
      );
      if (uploadError) {
        setError(getSupabaseErrorMessage(uploadError, 'No se pudo subir el CV. Inténtalo de nuevo.'));
        return;
      }

      await profileService.updateCandidateProfile(user.id, {
        cv_path: path,
        cv_name: cvFile.name,
      });

      applicationCvPath = path;
      cvName = cvFile.name;
    } else {
      setError('Debes seleccionar o subir un CV en PDF.');
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

    if (existingApplication?.status && existingApplication.status !== 'withdrawn') {
      setError('Ya has aplicado a esta oferta. Puedes revisar el estado en Mis aplicaciones.');
      setLoading(false);
      return;
    }

    const customAnswers = customQuestions.reduce((acc, q) => {
      if (answers[q.id]?.trim()) acc[q.id] = answers[q.id].trim();
      return acc;
    }, {});

    const notes = coverLetter.trim();

    const applicationPayload = {
      candidate_id: user.id,
      job_id: jobId,
      cv_path: applicationCvPath,
      cv_name: cvName,
      full_name: fullName,
      additional_notes: notes || null,
      custom_answers: Object.keys(customAnswers).length ? customAnswers : null,
    };

    const { error: applyError } = existingApplication?.status === 'withdrawn'
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
      await notificationsService.create({
        recipient_id: job.company_id,
        type: 'new_application',
        title: notificationTitle,
        body: notificationBody,
        metadata: {
          job_id: jobId,
          candidate_id: user.id,
          link: '/company/applicants',
        },
      });

      await notificationsService.sendPush({
        recipientIds: [job.company_id],
        title: notificationTitle,
        body: notificationBody,
        data: {
          type: 'new_application',
          link: '/company/applicants',
          job_id: jobId,
          candidate_id: user.id,
        },
      });
    }

    showToast('Aplicación enviada', 'success');
    navigate('/candidate/applications', { replace: true });
  };

  if (jobLoading) {
    return (
      <PageContainer title="Aplicar al empleo" backButton bottomNav={false}>
        <p className="p-4 text-sm text-gray-500">Cargando...</p>
      </PageContainer>
    );
  }

  if (!job) {
    return (
      <PageContainer title="Aplicar al empleo" backButton bottomNav={false}>
        <p className="p-4 text-sm text-gray-500">Oferta no encontrada o no disponible.</p>
      </PageContainer>
    );
  }

  return (
    <FormPageLayout
      title="Aplicar al empleo"
      backButton
      footer={
        <>
          {error ? <p className="mb-sm text-small text-red-600">{error}</p> : null}
          <Button type="submit" form="apply-job-form" fullWidth loading={loading} disabled={hasActiveApplication} className="btn-primary-mobile !rounded-btn-primary !py-0">
            {hasActiveApplication ? 'Ya aplicaste' : 'Enviar aplicación'}
          </Button>
        </>
      }
    >
      <form id="apply-job-form" onSubmit={handleSubmit} className="space-y-md p-md pb-lg">
        {job && (
          <Card padding="md">
            <p className="font-semibold text-gray-900">{job.title}</p>
            <p className="text-sm text-gray-500">{job.city}</p>
          </Card>
        )}

        <Card padding="md" className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">CV</h3>
          {hasSavedCv && (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3">
              <input
                type="radio"
                name="cvMode"
                checked={cvMode === 'saved'}
                onChange={() => setCvMode('saved')}
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Usar CV guardado</p>
                <p className="text-xs text-gray-500">{profile.cv_name || 'cv.pdf'}</p>
              </div>
            </label>
          )}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3">
            <input
              type="radio"
              name="cvMode"
              checked={cvMode === 'upload'}
              onChange={() => setCvMode('upload')}
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Subir nuevo CV (PDF)</p>
              {cvMode === 'upload' && (
                <div className="mt-2">
                  <FileUpload
                    label={cvFile ? cvFile.name : 'Seleccionar PDF'}
                    accept="application/pdf"
                    fileType="cv"
                    hint={FILE_HINTS.cv}
                    onUpload={(file, uploadError) => {
                      if (uploadError) setError(uploadError);
                      else {
                        setCvFile(file);
                        setError('');
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </label>
        </Card>

        <Textarea
          label="Carta de presentación (opcional)"
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          rows={4}
          placeholder="Cuéntanos por qué te interesa este puesto..."
        />

        {customQuestions.length > 0 && (
          <Card padding="md" className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Preguntas del empleo</h3>
            {customQuestions.map((q) => (
              <div key={q.id}>
                <Input
                  label={q.question}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  required={q.required}
                />
              </div>
            ))}
          </Card>
        )}

      </form>
    </FormPageLayout>
  );
}
