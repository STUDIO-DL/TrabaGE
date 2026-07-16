import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import FormPageLayout from '../../components/layout/FormPageLayout';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import DynamicListInput from '../../components/ui/DynamicListInput';
import Card from '../../components/ui/Card';
import { FormPageSkeleton } from '../../components/common/Skeleton';
import { CITIES } from '../../constants/cities';
import { JOB_TYPES } from '../../constants/jobTypes';
import { WORK_MODES } from '../../constants/workModes';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_SETUP, ROLES, rolePath } from '../../constants/roles';
import { useNotificationContext } from '../../context/NotificationContext';
import { jobsService } from '../../services/jobs.service';
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
    salary: form.salary.trim() || null,
    salary_negotiable: form.salaryNegotiable,
    city: form.city,
    job_type: form.job_type,
    work_mode: form.work_mode,
    application_deadline: form.application_deadline || null,
    custom_questions: customQuestions.length ? customQuestions : null,
    status,
  };
}

function parseList(value) {
  if (Array.isArray(value)) return value.length ? value : [''];
  if (!value) return [''];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length ? parsed : [''];
  } catch {
    return String(value)
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function parseCustomQuestions(value) {
  if (!value) return [''];
  const list = Array.isArray(value) ? value : [];
  return list.map((item) => item.question || item).filter(Boolean);
}

export default function PublishJob() {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const { user, isPreviewMode, setupComplete, role } = useAuth();
  const base = role || ROLES.BUSINESS;
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
  const [initialLoading, setInitialLoading] = useState(Boolean(jobId));
  const [error, setError] = useState('');
  const [originalStatus, setOriginalStatus] = useState(null);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!jobId) {
      setInitialLoading(false);
      return;
    }

    let mounted = true;
    setInitialLoading(true);
    jobsService.getJobById(jobId).then(({ data, error: loadError }) => {
      if (!mounted) return;
      if (loadError || !data || data.company_id !== user?.id) {
        setError('No se pudo cargar esta oferta.');
        setInitialLoading(false);
        return;
      }

      setForm({
        title: data.title || '',
        description: data.description || '',
        requirements: parseList(data.requirements),
        benefits: parseList(data.benefits),
        salary: data.salary || '',
        salaryNegotiable: Boolean(data.salary_negotiable),
        city: data.city || '',
        job_type: data.job_type || '',
        work_mode: data.work_mode || '',
        application_deadline: data.application_deadline || '',
        customQuestions: parseCustomQuestions(data.custom_questions),
      });
      setOriginalStatus(data.status);
      setInitialLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [jobId, user?.id]);

  const saveJob = async (status) => {
    if (isPreviewMode) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      return;
    }

    if (!user?.id) {
      setError('No se pudo identificar al usuario autenticado.');
      return;
    }

    // Publishing requires a complete company/institution profile. Drafts are
    // allowed so work isn't lost; only going live is restricted.
    if (status === 'active' && !setupComplete) {
      setError('Completa el perfil de tu empresa antes de publicar ofertas.');
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
    const { data: job, error: saveError } = jobId
      ? await jobsService.updateJob(jobId, payload)
      : await jobsService.createJob(payload);

    if (saveError) {
      setError(saveError.message);
      setLoading(false);
      return;
    }

    if (status === 'active' && job?.id && originalStatus !== 'active') {
      await jobsService.notifyJobPublished(job);
    }

    showToast(
      jobId
        ? 'Oferta actualizada'
        : status === 'draft'
          ? 'Borrador guardado'
          : 'Empleo publicado',
      'success',
    );
    navigate(rolePath(base, '/jobs'), { replace: true });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveJob('active');
  };

  if (initialLoading) {
    return (
      <PageContainer title="Editar empleo" backButton bottomNav={false}>
        <FormPageSkeleton fields={6} />
      </PageContainer>
    );
  }

  if (!isPreviewMode && !setupComplete) {
    return (
      <PageContainer title="Publicar empleo" backButton bottomNav={false}>
        <div className="p-md">
          <EmptyState
            title="Completa tu perfil para publicar"
            description="Antes de publicar ofertas, completa los datos requeridos de tu Business u Organización."
          />
          <Link to={ROLE_SETUP[role] || ROLE_SETUP[ROLES.BUSINESS]} className="mt-md block">
            <Button fullWidth className="btn-primary-mobile !rounded-btn-primary !py-0">
              Completar perfil
            </Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <FormPageLayout
      title={jobId ? 'Editar empleo' : 'Publicar empleo'}
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
            {jobId ? 'Guardar como borrador' : 'Guardar borrador'}
            </Button>
            <Button type="submit" form="publish-job-form" fullWidth loading={loading} className="btn-primary-mobile !rounded-btn-primary !py-0">
              {jobId ? 'Guardar y publicar' : 'Publicar empleo'}
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
          <Input
            label="Importe (opcional)"
            value={form.salary}
            onChange={(e) => setField('salary', e.target.value)}
            placeholder="Ej. 500.000 - 800.000 XAF"
            hint="Indica el salario estimado en XAF. Puedes combinarlo con la opción negociable."
          />
          <div className="flex items-center justify-between gap-3 rounded-radius-md border border-app-border bg-app-surface px-space-md py-space-sm">
            <div className="min-w-0">
              <p className="text-body-small font-medium text-app-text">Salario negociable</p>
              <p className="text-caption text-app-subtle">
                Indica que la remuneración puede acordarse con el candidato
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.salaryNegotiable}
              aria-label="Salario negociable"
              onClick={() => setField('salaryNegotiable', !form.salaryNegotiable)}
              className={[
                'relative h-7 w-12 shrink-0 rounded-full p-0.5 transition-all duration-200 ease-out',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2',
                form.salaryNegotiable
                  ? 'bg-primary-600 shadow-[0_8px_18px_rgba(37,99,235,0.24)]'
                  : 'bg-slate-200',
                'active:scale-95',
              ].join(' ')}
            >
              <span
                className={[
                  'block h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out',
                  form.salaryNegotiable ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
          </div>
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

