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
import { WORK_MODES } from '../../constants/workModes';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { ROLES, rolePath } from '../../constants/roles';
import { useNotificationContext } from '../../context/NotificationContext';
import { jobsService } from '../../services/jobs.service';
import { companyService } from '../../services/company.service';
import { isCompanyRequiredComplete } from '../../utils/profileRequirements';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import { normalizeSalaryInput } from '../../utils/formatSalary';
import {
  benefitsToText,
  requirementsToText,
  textToBenefits,
  textToRequirements,
} from '../../utils/jobParsing';

const TEXT_MAX = 5000;

function buildJobPayload(form, companyId, status) {
  const customQuestions = form.customQuestions
    .map((q) => q.trim())
    .filter(Boolean)
    .map((question, index) => ({ id: `q${index + 1}`, question, required: true }));

  return {
    company_id: companyId,
    title: form.title.trim(),
    role: form.role.trim() || null,
    description: form.description.trim() || null,
    requirements: textToRequirements(form.requirements) || null,
    benefits: textToBenefits(form.benefits),
    salary: normalizeSalaryInput(form.salary) || null,
    salary_negotiable: form.salaryNegotiable,
    city: form.city,
    work_mode: form.work_mode,
    application_deadline: form.application_deadline || null,
    custom_questions: customQuestions.length ? customQuestions : null,
    status,
  };
}

function parseCustomQuestions(value) {
  if (!value) return [''];
  const list = Array.isArray(value) ? value : [];
  return list.map((item) => item.question || item).filter(Boolean);
}

function validateStructuredFields(form, status) {
  if (!form.title.trim()) {
    return 'El título es obligatorio.';
  }
  if (!form.city || !form.work_mode) {
    return 'Completa ciudad y modalidad de trabajo.';
  }
  if (status !== 'active') return '';

  if (!form.role.trim()) {
    return 'El rol (El puesto) es obligatorio para publicar.';
  }
  if (!form.description.trim()) {
    return 'La descripción es obligatoria para publicar.';
  }
  if (!form.requirements.trim()) {
    return 'Los requisitos son obligatorios para publicar.';
  }
  return '';
}

export default function PublishJob() {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const { user, isPreviewMode, role } = useAuth();
  const { profile, loading: profileLoading, isFetched: profileFetched } = useProfile();
  const base = role || ROLES.BUSINESS;
  const { showToast } = useNotificationContext();
  const profileCheckPending = !isPreviewMode && (profileLoading || !profileFetched);
  const profileIncomplete =
    !isPreviewMode && profileFetched && !isCompanyRequiredComplete(profile);
  const [form, setForm] = useState({
    title: '',
    role: '',
    description: '',
    requirements: '',
    benefits: '',
    salary: '',
    salaryNegotiable: false,
    city: '',
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
        role: data.role || '',
        description: data.description || '',
        requirements: requirementsToText(data.requirements),
        benefits: benefitsToText(data.benefits),
        salary: data.salary ? normalizeSalaryInput(data.salary) : '',
        salaryNegotiable: Boolean(data.salary_negotiable),
        city: data.city || '',
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

    if (status === 'active' && !isCompanyRequiredComplete(profile)) {
      setError('Completa el perfil de tu empresa antes de publicar ofertas.');
      return;
    }

    const validationError = validateStructuredFields(form, status);
    if (validationError) {
      setError(validationError);
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

  if (profileCheckPending) {
    return (
      <PageContainer title={jobId ? 'Editar empleo' : 'Publicar empleo'} backButton bottomNav={false}>
        <FormPageSkeleton fields={6} />
      </PageContainer>
    );
  }

  if (profileIncomplete) {
    return (
      <PageContainer title="Publicar empleo" backButton bottomNav={false}>
        <div className="p-md">
          <EmptyState
            title="Completa tu perfil para publicar"
            description="Antes de publicar ofertas, completa los datos requeridos de tu cuenta Business u organización."
          />
          <Link to={`${rolePath(role || ROLES.BUSINESS, '/profile')}?complete=publish`} className="mt-md block">
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
        <p className="text-caption text-app-subtle">
          Los campos marcados con <span className="text-red-600" aria-hidden="true">*</span> son obligatorios.
        </p>
        <Card padding="md" className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Información básica</h2>
          <Input
            label="Título del empleo"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="Ej. Desarrollador frontend"
            required
          />
          <Select
            label="Ciudad"
            value={form.city}
            onChange={(e) => setField('city', e.target.value)}
            options={[{ value: '', label: 'Seleccionar' }, ...CITIES.map((c) => ({ value: c, label: c }))]}
            required
          />
          <Select
            label="Modalidad"
            value={form.work_mode}
            onChange={(e) => setField('work_mode', e.target.value)}
            options={[{ value: '', label: 'Seleccionar' }, ...WORK_MODES]}
            required
          />
        </Card>

        <Card padding="md" className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Salario</h2>
          <Input
            label="Importe (opcional)"
            value={form.salary}
            onChange={(e) => setField('salary', e.target.value)}
            onBlur={(e) => {
              const normalized = normalizeSalaryInput(e.target.value);
              if (normalized !== form.salary) setField('salary', normalized);
            }}
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
            <h2 className="text-base font-semibold text-gray-900">El puesto</h2>
            <span className="text-xs text-gray-400">
              {form.role.length}/{TEXT_MAX}
            </span>
          </div>
          <Textarea
            label="Rol"
            value={form.role}
            onChange={(e) => setField('role', e.target.value.slice(0, TEXT_MAX))}
            rows={5}
            placeholder="Describe el puesto y las expectativas principales del rol..."
            hint="Resume qué implica el puesto y qué busca la empresa."
            required
          />
        </Card>

        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Descripción</h2>
            <span className="text-xs text-gray-400">
              {form.description.length}/{TEXT_MAX}
            </span>
          </div>
          <Textarea
            label="Descripción"
            value={form.description}
            onChange={(e) => setField('description', e.target.value.slice(0, TEXT_MAX))}
            rows={6}
            placeholder="Describe las responsabilidades, el entorno de trabajo y el día a día..."
            required
          />
        </Card>

        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Requisitos</h2>
            <span className="text-xs text-gray-400">
              {form.requirements.length}/{TEXT_MAX}
            </span>
          </div>
          <Textarea
            label="Requisitos"
            value={form.requirements}
            onChange={(e) => setField('requirements', e.target.value.slice(0, TEXT_MAX))}
            rows={5}
            placeholder={'Ej.\n• 2 años de experiencia en ventas\n• Dominio de Excel\n• Disponibilidad inmediata'}
            hint="Escribe un requisito por línea."
            required
          />
        </Card>

        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Beneficios</h2>
            <span className="text-xs text-gray-400">
              {form.benefits.length}/{TEXT_MAX}
            </span>
          </div>
          <Textarea
            label="Beneficios (opcional)"
            value={form.benefits}
            onChange={(e) => setField('benefits', e.target.value.slice(0, TEXT_MAX))}
            rows={4}
            placeholder={'Ej.\n• Seguro médico\n• Formación continua\n• Horario flexible'}
            hint="Opcional. Escribe un beneficio por línea."
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

