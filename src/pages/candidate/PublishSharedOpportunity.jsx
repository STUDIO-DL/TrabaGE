import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import FormPageLayout from '../../components/layout/FormPageLayout';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Card from '../../components/ui/Card';
import { FormPageSkeleton } from '../../components/common/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useNotificationContext } from '../../context/NotificationContext';
import { jobsService } from '../../services/jobs.service';
import { isSharedOpportunityProfileComplete } from '../../utils/profileRequirements';
import { exitGuestToAuth, GUEST_MODE_MESSAGE } from '../../utils/guestMode';
import { getUserErrorMessage, ERROR_ACTION } from '../../utils/userFacingError';
import { ROLES } from '../../constants/roles';
import { normalizeHttpsUrl } from '../../utils/safeUrl';
import { normalizeSalaryInput } from '../../utils/formatSalary';

const DESCRIPTION_MAX = 5000;
const TITLE_MAX = 180;
const CONTACT_MAX = 240;
const URL_MAX = 2048;

const EMPTY_FORM = {
  title: '',
  location: '',
  description: '',
  requirements: '',
  salary: '',
  salaryNegotiable: false,
  contactWhatsApp: '',
  contactPhone: '',
  contactEmail: '',
  applicationUrl: '',
  applicationDeadline: '',
};

export default function PublishSharedOpportunity() {
  const navigate = useNavigate();
  const { user, role, isPreviewMode } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { showToast } = useNotificationContext();

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const profileIncomplete =
    !isPreviewMode &&
    !profileLoading &&
    !isSharedOpportunityProfileComplete(profile);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const validate = () => {
    if (!form.title.trim()) {
      return 'El título del empleo es obligatorio.';
    }

    if (form.title.trim().length > TITLE_MAX) {
      return `El título no puede superar ${TITLE_MAX} caracteres.`;
    }

    if (!form.description.trim()) {
      return 'La descripción es obligatoria.';
    }

    if (form.description.trim().length > DESCRIPTION_MAX) {
      return `La descripción no puede superar ${DESCRIPTION_MAX} caracteres.`;
    }

    const hasContact = [
      form.contactWhatsApp,
      form.contactPhone,
      form.contactEmail,
      form.applicationUrl,
    ].some((value) => String(value ?? '').trim().length > 0);

    if (!hasContact) {
      return 'Añade al menos una forma de contacto para que las personas interesadas puedan comunicarse contigo.';
    }

    if (
      String(form.contactWhatsApp ?? '').trim().length > CONTACT_MAX
    ) {
      return `El WhatsApp no puede superar ${CONTACT_MAX} caracteres.`;
    }

    if (
      String(form.contactPhone ?? '').trim().length > CONTACT_MAX
    ) {
      return `El teléfono no puede superar ${CONTACT_MAX} caracteres.`;
    }

    if (
      String(form.contactEmail ?? '').trim().length > CONTACT_MAX
    ) {
      return `El email no puede superar ${CONTACT_MAX} caracteres.`;
    }

    if (String(form.applicationUrl ?? '').trim().length > URL_MAX) {
      return `El enlace no puede superar ${URL_MAX} caracteres.`;
    }

    if (
      String(form.applicationUrl ?? '').trim() &&
      !normalizeHttpsUrl(form.applicationUrl)
    ) {
      return 'Introduce un enlace válido que empiece por https://.';
    }

    if (form.applicationDeadline && form.applicationDeadline < new Date().toISOString().slice(0, 10)) {
      return 'La fecha límite no puede estar en el pasado.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isPreviewMode || !user?.id) {
      showToast(GUEST_MODE_MESSAGE, 'info');
      exitGuestToAuth(navigate);
      return;
    }

    if (role !== ROLES.PERSONAL) {
      setError(
        'Solo las cuentas personales pueden publicar oportunidades compartidas.',
      );
      return;
    }

    if (!isSharedOpportunityProfileComplete(profile)) {
      setError(
        'Para publicar oportunidades de empleo primero debes completar tu perfil. Esto ayuda a generar confianza y mejora la calidad de las publicaciones.',
      );
      return;
    }

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    const contactLines = [];

    if (String(form.contactWhatsApp ?? '').trim()) {
      contactLines.push(
        `WhatsApp: ${String(form.contactWhatsApp).trim()}`,
      );
    }

    if (String(form.contactPhone ?? '').trim()) {
      contactLines.push(
        `Teléfono: ${String(form.contactPhone).trim()}`,
      );
    }

    if (String(form.contactEmail ?? '').trim()) {
      contactLines.push(
        `Email: ${String(form.contactEmail).trim()}`,
      );
    }

    const contactMethod = contactLines.join('\n') || null;

    const { data, error: saveError } =
      await jobsService.createSharedOpportunity({
        userId: user.id,
        title: form.title,
        description: form.description,
        city: form.location,
        contactMethod,
        contactWhatsApp: form.contactWhatsApp,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        requirements: form.requirements,
        applicationUrl: normalizeHttpsUrl(form.applicationUrl),
        applicationDeadline: form.applicationDeadline || null,
        salary: normalizeSalaryInput(form.salary) || null,
        salaryNegotiable: form.salaryNegotiable,
      });

    setLoading(false);

    if (saveError) {
      setError(
        saveError.message ||
          getUserErrorMessage(saveError, ERROR_ACTION.publish_job),
      );
      return;
    }

    void jobsService.notifyJobPublished(data);
    showToast('Oportunidad compartida publicada', 'success');
    navigate(`/personal/jobs/${data.id}`);
  };

  if (isPreviewMode) {
    return (
      <PageContainer
        title="Publicar oportunidad"
        backButton
        bottomNav={false}
      >
        <div className="p-md">
          <EmptyState
            title="Inicia sesión"
            description={GUEST_MODE_MESSAGE}
          />

          <Link to="/login" className="mt-md block">
            <Button
              fullWidth
              className="btn-primary-mobile !rounded-btn-primary !py-0"
            >
              Iniciar sesión
            </Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  if (profileLoading) {
    return (
      <PageContainer
        title="Publicar oportunidad"
        backButton
        bottomNav={false}
      >
        <FormPageSkeleton fields={4} />
      </PageContainer>
    );
  }

  if (profileIncomplete) {
    return (
      <PageContainer
        title="Publicar oportunidad"
        backButton
        bottomNav={false}
      >
        <div className="p-md">
          <EmptyState
            title="Completa tu perfil"
            description="Para publicar oportunidades de empleo primero debes completar tu perfil. Esto ayuda a generar confianza y mejora la calidad de las publicaciones."
          />

          <Link
            to="/personal/profile/edit-intro"
            className="mt-md block"
          >
            <Button
              fullWidth
              className="btn-primary-mobile !rounded-btn-primary !py-0"
            >
              Completar perfil
            </Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <FormPageLayout
      title="Publicar oportunidad"
      backButton
      footer={
        <>
          {error ? (
            <p className="mb-sm text-small text-red-600">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            form="publish-shared-opportunity-form"
            fullWidth
            loading={loading}
            className="btn-primary-mobile !rounded-btn-primary !py-0"
          >
            Publicar oportunidad
          </Button>
        </>
      }
    >
      <form
        id="publish-shared-opportunity-form"
        onSubmit={handleSubmit}
        className="space-y-md p-md pb-lg"
      >
        <p className="rounded-radius-md border border-app-border bg-app-surface px-space-base py-space-sm text-caption text-app-muted">
          <span aria-hidden="true">👤 </span>
          Estás publicando una{' '}
          <strong className="font-semibold text-app-text">
            oportunidad compartida
          </strong>
          . No es una oferta oficial de empresa.
        </p>

        <p className="text-caption text-app-subtle">
          Los campos marcados con{' '}
          <span className="text-red-600" aria-hidden="true">
            *
          </span>{' '}
          son obligatorios.
        </p>

        <Card padding="md" className="space-y-4">
          <Input
            label="Título del empleo"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="Ej. Ayudante de cocina en Malabo"
            maxLength={TITLE_MAX}
            required
          />

          <Input
            label="Ubicación"
            value={form.location}
            onChange={(e) => setField('location', e.target.value)}
            placeholder="Ciudad o zona (opcional)"
          />

          <Textarea
            label="Descripción"
            value={form.description}
            onChange={(e) =>
              setField('description', e.target.value)
            }
            placeholder="Describe la oportunidad, requisitos básicos y cualquier detalle útil."
            rows={6}
            maxLength={DESCRIPTION_MAX}
            required
          />

          <Textarea
            label="Requisitos (opcional)"
            value={form.requirements}
            onChange={(e) =>
              setField('requirements', e.target.value)
            }
            placeholder="Indica los requisitos, experiencia o condiciones que consideres importantes..."
            rows={4}
            maxLength={DESCRIPTION_MAX}
          />

          <Input
            label="Salario (opcional)"
            value={form.salary}
            onChange={(e) => setField('salary', e.target.value)}
            onBlur={(e) => {
              const normalized = normalizeSalaryInput(e.target.value);
              if (normalized !== form.salary) setField('salary', normalized);
            }}
            placeholder="Ej. 500.000 - 800.000 XAF"
          />

          <div className="flex items-center justify-between gap-3 rounded-radius-md border border-app-border bg-app-surface px-space-md py-space-sm">
            <div className="min-w-0">
              <p className="text-body-small font-medium text-app-text">
                Salario negociable
              </p>
              <p className="text-caption text-app-subtle">
                Indica que la remuneración puede acordarse con la persona
                interesada
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.salaryNegotiable}
              aria-label="Salario negociable"
              onClick={() =>
                setField('salaryNegotiable', !form.salaryNegotiable)
              }
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

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">
              Forma de contacto
            </p>

            <Input
              label="WhatsApp"
              value={form.contactWhatsApp}
              onChange={(e) =>
                setField('contactWhatsApp', e.target.value)
              }
              placeholder="Ej. +240 123 456 789"
              maxLength={CONTACT_MAX}
            />

            <Input
              label="Teléfono"
              value={form.contactPhone}
              onChange={(e) =>
                setField('contactPhone', e.target.value)
              }
              placeholder="Ej. +240 123 456 789"
              maxLength={CONTACT_MAX}
            />

            <Input
              label="Email"
              value={form.contactEmail}
              onChange={(e) =>
                setField('contactEmail', e.target.value)
              }
              placeholder="Ej. ejemplo@correo.com"
              maxLength={CONTACT_MAX}
            />
          </div>

          <Input
            type="url"
            label="Enlace (opcional)"
            value={form.applicationUrl}
            onChange={(e) =>
              setField('applicationUrl', e.target.value)
            }
            placeholder="https://..."
            maxLength={URL_MAX}
          />

          <Input
            type="date"
            label="Fecha límite (opcional)"
            value={form.applicationDeadline}
            onChange={(e) => setField('applicationDeadline', e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
          />
        </Card>
      </form>
    </FormPageLayout>
  );
    }
