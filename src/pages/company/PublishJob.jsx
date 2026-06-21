import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import FormPageLayout from '../../components/layout/FormPageLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import DynamicListInput from '../../components/ui/DynamicListInput';
import Card from '../../components/ui/Card';
import { CITIES } from '../../constants/cities';
import { JOB_TYPES } from '../../constants/jobTypes';
import { WORK_MODES } from '../../constants/workModes';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../context/NotificationContext';
import { jobsService } from '../../services/jobs.service';
import { notificationsService } from '../../services/notifications.service';
import { jobRecommendationsService } from '../../services/jobRecommendations.service';
import { FOLLOWS_TARGET } from '../../services/follows.service';
import { companyService } from '../../services/company.service';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';

const DESCRIPTION_MAX = 5000;

function buildJobPayload(form, companyId, status) {
  const requirements = form.requirements.map((r) => r.trim()).filter(Boolean);
  const benefits = form.benefits.map((b) => b.trim()).filter(Boolean);
  const customQuestions = form.customQuestions
    .map((q) => q.trim())
    .filter(Boolean)
    .map((question, index) => ({ id: `q${index + 1}`, question, required: true }));

  return {
    company_id: companyId,
    title: form.title.trim(),
    description: form.description.trim(),
    requirements: JSON.stringify(requirements),
    benefits,
    salary: form.salaryNegotiable ? null : form.salary.trim() || null,
    salary_negotiable: form.salaryNegotiable,
    city: form.city,
    job_type: form.job_type,
    work_mode: form.work_mode,
    application_deadline: form.application_deadline || null,
    custom_questions: customQuestions.length ? customQuestions : null,
    status,
  };
}

export default function PublishJob() {
  const navigate = useNavigate();
  const { user, isPreviewMode } = useAuth();
  const { showToast } = useNotificationContext();
  const [form, setForm] = useState({
    title: '',
    description: '',
    requirements: [''],
    benefits: [''],
    salary: '',
    salaryNegotiable: false,
    city: '',
    job_type: '',
    work_mode: '',
    application_deadline: '',
    customQuestions: [''],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const saveJob = async (status) => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      return;
    }

    if (!user?.id) {
      setError('No se pudo identificar al usuario autenticado.');
      return;
    }

    if (!form.title.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    if (!form.city || !form.job_type || !form.work_mode) {
      setError('Completa ciudad, tipo de empleo y modalidad de trabajo.');
      return;
    }
    if (!form.description.trim()) {
      setError('La descripción es obligatoria.');
      return;
    }

    setLoading(true);
    setError('');

    const { data: companyProfile, error: profileError } = await companyService.getCompanyProfile(user.id);
    if (profileError || !companyProfile?.user_id) {
      setError('Debes completar tu perfil de empresa antes de publicar un empleo.');
      setLoading(false);
      return;
    }

    const payload = buildJobPayload(form, user.id, status);
    const { data: job, error: saveError } = await jobsService.createJob(payload);

    if (saveError) {
      setError(saveError.message);
      setLoading(false);
      return;
    }

    if (status === 'active' && job?.id) {
      const companyName = companyProfile?.company_name?.trim() || 'Empresa';
      const citySuffix = form.city ? ` - ${form.city}` : '';

      await notificationsService.notifyFollowers({
        targetType: FOLLOWS_TARGET.COMPANY,
        targetId: user.id,
        type: 'new_job',
        title: `Nueva oferta de ${companyName}`,
        message: `${form.title.trim()}${citySuffix}`,
        link: `/candidate/jobs/${job.id}`,
      });

      jobRecommendationsService.processNewJob(job).catch((error) => {
        console.warn('[TrabaGE] Job recommendations failed:', error?.message || error);
      });
    }

    showToast(status === 'draft' ? 'Borrador guardado' : 'Empleo publicado', 'success');
    navigate('/company/dashboard', { replace: true });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveJob('active');
  };

  return (
    <FormPageLayout
      title="Publicar empleo"
      backButton
      footer={
        <>
          {error ? <p className="mb-sm text-small text-red-600">{error}</p> : null}
          <div className="flex flex-col gap-sm sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              loading={loading}
              onClick={() => saveJob('draft')}
              className="btn-secondary-mobile !rounded-btn-secondary !py-0"
            >
              Guardar borrador
            </Button>
            <Button type="submit" form="publish-job-form" fullWidth loading={loading} className="btn-primary-mobile !rounded-btn-primary !py-0">
              Publicar empleo
            </Button>
          </div>
        </>
      }
    >
      <form id="publish-job-form" onSubmit={handleSubmit} className="space-y-md p-md pb-lg">
        <Card padding="md" className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Información básica</h2>
          <Input
            label="Título del empleo"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            required
          />
          <Select
            label="Tipo de empleo"
            value={form.job_type}
            onChange={(e) => setField('job_type', e.target.value)}
            options={[{ value: '', label: 'Seleccionar' }, ...JOB_TYPES]}
          />
          <Select
            label="Ciudad"
            value={form.city}
            onChange={(e) => setField('city', e.target.value)}
            options={[{ value: '', label: 'Seleccionar' }, ...CITIES.map((c) => ({ value: c, label: c }))]}
          />
          <Select
            label="Modalidad"
            value={form.work_mode}
            onChange={(e) => setField('work_mode', e.target.value)}
            options={[{ value: '', label: 'Seleccionar' }, ...WORK_MODES]}
          />
        </Card>

        <Card padding="md" className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Salario</h2>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.salaryNegotiable}
              onChange={(e) => setField('salaryNegotiable', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600"
            />
            Salario negociable
          </label>
          {!form.salaryNegotiable && (
            <Input
              label="Salario (opcional)"
              value={form.salary}
              onChange={(e) => setField('salary', e.target.value)}
              placeholder="Ej. 500.000 - 800.000 XAF"
            />
          )}
        </Card>

        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Descripción</h2>
            <span className="text-xs text-gray-400">
              {form.description.length}/{DESCRIPTION_MAX}
            </span>
          </div>
          <Textarea
            value={form.description}
            onChange={(e) => setField('description', e.target.value.slice(0, DESCRIPTION_MAX))}
            rows={8}
            placeholder="Describe el puesto, responsabilidades y el entorno de trabajo..."
          />
        </Card>

        <Card padding="md">
          <DynamicListInput
            label="Requisitos"
            items={form.requirements}
            onChange={(items) => setField('requirements', items.length ? items : [''])}
            placeholder="Ej. 2 años de experiencia en ventas"
          />
        </Card>

        <Card padding="md">
          <DynamicListInput
            label="Beneficios"
            items={form.benefits}
            onChange={(items) => setField('benefits', items.length ? items : [''])}
            placeholder="Ej. Seguro médico"
          />
        </Card>

        <Card padding="md" className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Fecha límite de aplicación</h2>
          <Input
            type="date"
            value={form.application_deadline}
            onChange={(e) => setField('application_deadline', e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
          />
        </Card>

        <Card padding="md">
          <DynamicListInput
            label="Preguntas personalizadas"
            items={form.customQuestions}
            onChange={(items) => setField('customQuestions', items.length ? items : [''])}
            placeholder="Ej. ¿Cuántos años de experiencia tienes?"
            addLabel="Añadir pregunta"
          />
        </Card>

      </form>
    </FormPageLayout>
  );
}

