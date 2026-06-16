import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
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
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';

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

  const customQuestions = parseCustomQuestions(job?.custom_questions);
  const hasSavedCv = Boolean(profile?.cv_url);

  useEffect(() => {
    if (isPreviewMode) {
      navigate('/login', { replace: true });
    }
  }, [isPreviewMode, navigate]);

  useEffect(() => {
    if (!hasSavedCv) setCvMode('upload');
  }, [hasSavedCv]);

  useEffect(() => {
    if (profile?.full_name && !answers.full_name) {
      setAnswers((prev) => ({ ...prev, full_name: profile.full_name }));
    }
  }, [profile?.full_name, answers.full_name]);

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

    let cvUrl = null;
    let cvName = null;

    if (cvMode === 'saved' && hasSavedCv) {
      cvUrl = profile.cv_url;
      cvName = profile.cv_name || 'cv.pdf';
    } else if (cvFile) {
      const path = `${user.id}/applications/cvs/${jobId}-${Date.now()}.pdf`;
      const { error: uploadError } = await storageService.uploadApplicationCV(user.id, jobId, cvFile, path);
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      cvUrl = path;
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

    const customAnswers = customQuestions.reduce((acc, q) => {
      if (answers[q.id]?.trim()) acc[q.id] = answers[q.id].trim();
      return acc;
    }, {});

    const { error: applyError } = await applicationsService.apply({
      candidate_id: user.id,
      job_id: jobId,
      cv_url: cvUrl,
      cv_name: cvName,
      full_name: fullName,
      additional_notes: coverLetter.trim() || null,
      custom_answers: Object.keys(customAnswers).length ? customAnswers : null,
    });

    if (applyError) {
      setError(applyError.message);
      setLoading(false);
      return;
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

  return (
    <PageContainer title="Aplicar al empleo" backButton bottomNav={false}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
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
                    fileType="document"
                    maxSize="5 MB"
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

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth loading={loading}>
          Enviar aplicación
        </Button>
      </form>
    </PageContainer>
  );
}
