import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormPageLayout from '../../components/layout/FormPageLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Spinner from '../../components/ui/Spinner';
import ExperienceModal from '../../components/profile/modals/ExperienceModal';
import EducationModal from '../../components/profile/modals/EducationModal';
import { CITIES } from '../../constants/cities';
import { COUNTRIES, DEFAULT_COUNTRY } from '../../constants/countries';
import { SECTORS } from '../../constants/sectors';
import { useAuth } from '../../hooks/useAuth';
import { useCandidateProfile } from '../../hooks/useCandidateProfile';
import { useNotificationContext } from '../../context/NotificationContext';
import { readIdentityFromUser } from '../../utils/displayIdentity';
import {
  buildEducationSelectOptions,
  getCurrentExperience,
  HEADLINE_MAX_LENGTH,
  validateIntroForm,
} from '../../utils/profileIntro';
import { TOAST } from '../../utils/copyLabels';

function EditIntroSection({ title, description, children }) {
  return (
    <section className="border-b border-app-border px-space-base py-space-lg last:border-b-0">
      <h2 className="text-body font-semibold text-app-text">{title}</h2>
      {description ? (
        <p className="mt-space-xs text-body-small text-app-muted">{description}</p>
      ) : null}
      <div className="mt-space-md space-y-space-md">{children}</div>
    </section>
  );
}

const emptyForm = {
  full_name: '',
  headline: '',
  sector: '',
  country: DEFAULT_COUNTRY,
  city: '',
  show_education_in_intro: false,
  intro_education_id: '',
};

export default function EditIntro() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotificationContext();
  const {
    profile,
    loading,
    updateBasicInfo,
    addExperience,
    updateExperience,
    addEducation,
    updateEducation,
  } = useCandidateProfile();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const formInitializedRef = useRef(false);
  const [experienceOpen, setExperienceOpen] = useState(false);
  const [educationOpen, setEducationOpen] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);

  useEffect(() => {
    if (!user || loading) return;
    if (formInitializedRef.current) return;
    formInitializedRef.current = true;

    const identity = readIdentityFromUser(user);
    setForm({
      full_name: profile?.full_name || identity.full_name || '',
      headline: profile?.headline || '',
      sector: profile?.sector || '',
      country: profile?.country || DEFAULT_COUNTRY,
      city: profile?.city || identity.city || '',
      show_education_in_intro: Boolean(profile?.show_education_in_intro),
      intro_education_id: profile?.intro_education_id || '',
    });
  }, [profile, user, loading]);

  const currentExperience = useMemo(
    () => getCurrentExperience(profile?.experience),
    [profile?.experience],
  );

  const educationOptions = useMemo(
    () => buildEducationSelectOptions(profile?.education),
    [profile?.education],
  );

  const setField = (field) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const nextErrors = validateIntroForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstError = Object.values(nextErrors)[0];
      showToast(firstError, 'error');
      const firstField = Object.keys(nextErrors)[0];
      document.getElementById(firstField)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      headline: form.headline.trim(),
      sector: form.sector.trim(),
      country: form.country.trim(),
      city: form.city.trim(),
      show_education_in_intro: form.show_education_in_intro,
      intro_education_id: form.show_education_in_intro ? form.intro_education_id || null : null,
    };

    const { error } = await updateBasicInfo(payload);
    setSaving(false);

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    showToast(TOAST.saved, 'success');
    navigate('/personal/profile');
  };

  const saveExperience = async (data, id) => {
    setModalSaving(true);
    const result = id ? await updateExperience(id, data) : await addExperience(data);
    setModalSaving(false);
    if (!result.error) {
      showToast('Experiencia guardada.', 'success');
    }
    return result;
  };

  const saveEducation = async (data, id) => {
    setModalSaving(true);
    const result = id ? await updateEducation(id, data) : await addEducation(data);
    setModalSaving(false);
    if (!result.error) {
      if (!id && result.data?.id) {
        setForm((prev) => ({
          ...prev,
          intro_education_id: result.data.id,
          show_education_in_intro: true,
        }));
      }
      showToast('Educación guardada.', 'success');
    }
    return result;
  };

  if (loading && !profile) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <FormPageLayout
        title="Editar intro"
        backButton
        footer={
          <Button type="submit" form="edit-intro-form" fullWidth loading={saving} size="lg">
            Guardar
          </Button>
        }
      >
        <form id="edit-intro-form" noValidate onSubmit={handleSave} className="pb-space-xl">
          <EditIntroSection title="Información básica">
            <Input
              label="Nombre"
              name="full_name"
              value={form.full_name}
              onChange={setField('full_name')}
              error={errors.full_name}
              required
              autoComplete="name"
            />
            <div>
              <Textarea
                label="Titular profesional"
                name="headline"
                rows={3}
                value={form.headline}
                onChange={setField('headline')}
                error={errors.headline}
                placeholder="Ej. Desarrollador frontend · Especialista en React"
                required
                maxLength={HEADLINE_MAX_LENGTH}
              />
              <p className="mt-space-xs text-right text-caption text-app-subtle">
                {form.headline.length}/{HEADLINE_MAX_LENGTH}
              </p>
            </div>
          </EditIntroSection>

          <EditIntroSection title="Puesto actual">
            {currentExperience ? (
              <div className="rounded-radius-md border border-app-border bg-app-surface px-space-md py-space-sm">
                <p className="text-body-small font-medium text-app-text">
                  {currentExperience.position}
                </p>
                <p className="text-caption text-app-muted">{currentExperience.company}</p>
              </div>
            ) : (
              <p className="text-body-small text-app-muted">
                Aún no has añadido ningún puesto.
              </p>
            )}
            <Button type="button" variant="outlined" fullWidth onClick={() => setExperienceOpen(true)}>
              + Añadir puesto
            </Button>
          </EditIntroSection>

          <EditIntroSection title="Sector">
            <Select
              label="Industria"
              name="sector"
              value={form.sector}
              onChange={setField('sector')}
              error={errors.sector}
              required
              options={[
                { value: '', label: 'Seleccionar sector' },
                ...SECTORS.map((sector) => ({ value: sector, label: sector })),
              ]}
            />
          </EditIntroSection>

          <EditIntroSection title="Educación">
            {profile?.education?.length ? (
              <Select
                label="Centro educativo principal"
                name="intro_education_id"
                value={form.intro_education_id}
                onChange={setField('intro_education_id')}
                error={errors.intro_education_id}
                options={educationOptions}
              />
            ) : (
              <p className="text-body-small text-app-muted">
                Añade tu formación para mostrarla en la intro.
              </p>
            )}
            <Button type="button" variant="outlined" fullWidth onClick={() => setEducationOpen(true)}>
              + Añadir educación
            </Button>
            <label className="flex min-h-touch cursor-pointer items-center gap-space-sm rounded-radius-md border border-app-border bg-app-surface px-space-md py-space-sm">
              <input
                id="show_education_in_intro"
                type="checkbox"
                checked={form.show_education_in_intro}
                onChange={setField('show_education_in_intro')}
                className="h-4 w-4 rounded border-app-border text-primary-600 focus:ring-primary-500"
              />
              <span className="text-body-small text-app-text">Mostrar centro en mi intro</span>
            </label>
            {errors.intro_education_id ? (
              <p id="intro_education_id" className="text-caption text-error-600">
                {errors.intro_education_id}
              </p>
            ) : null}
          </EditIntroSection>

          <EditIntroSection title="Ubicación">
            <Select
              label="País/Región"
              name="country"
              value={form.country}
              onChange={setField('country')}
              error={errors.country}
              required
              options={[
                { value: '', label: 'Seleccionar país' },
                ...COUNTRIES.map((country) => ({ value: country, label: country })),
              ]}
            />
            <Select
              label="Ciudad"
              name="city"
              value={form.city}
              onChange={setField('city')}
              error={errors.city}
              required
              options={[
                { value: '', label: 'Seleccionar ciudad' },
                ...CITIES.map((city) => ({ value: city, label: city })),
              ]}
            />
          </EditIntroSection>

          <EditIntroSection
            title="Datos de contacto"
            description="Tu correo y WhatsApp de contacto se muestran cuando alguien pulsa «Contactar» en tu perfil."
          >
            <Button
              type="button"
              variant="text"
              className="!justify-start px-0"
              onClick={() => navigate('/personal/profile#contacto')}
            >
              Editar datos de contacto
            </Button>
          </EditIntroSection>
        </form>
      </FormPageLayout>

      <ExperienceModal
        isOpen={experienceOpen}
        onClose={() => setExperienceOpen(false)}
        onSave={saveExperience}
        loading={modalSaving}
      />
      <EducationModal
        isOpen={educationOpen}
        onClose={() => setEducationOpen(false)}
        onSave={saveEducation}
        loading={modalSaving}
        userId={user?.id}
      />
    </>
  );
}
