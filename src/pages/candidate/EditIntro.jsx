import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormPageLayout from '../../components/layout/FormPageLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import LocationFields from '../../components/common/LocationFields';
import { FormPageSkeleton } from '../../components/common/Skeleton';
import EducationModal from '../../components/profile/modals/EducationModal';
import { ProfileEntryRow } from '../../components/profile/ProfileSectionCard';
import { DEFAULT_COUNTRY } from '../../constants/locations';
import { SECTORS } from '../../constants/sectors';
import { GraduationCap } from '../../constants/icons';
import { FORM_DRAFT_KEYS } from '../../constants/formDrafts';
import { useAuth } from '../../hooks/useAuth';
import { useCandidateProfile } from '../../hooks/useCandidateProfile';
import { DRAFT_RESTORED_MESSAGE, useFormDraft } from '../../hooks/useFormDraft';
import { useNotificationContext } from '../../context/NotificationContext';
import { readIdentityFromUser } from '../../utils/displayIdentity';
import { formatDateRange } from '../../utils/formatDate';
import {
  buildEducationSelectOptions,
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

function buildEducationMeta(item) {
  const dateRange = formatDateRange(
    item.start_date,
    item.is_current ? null : item.end_date,
  );
  const extras = [item.grade, item.skills?.length ? `${item.skills.length} habilidades` : null]
    .filter(Boolean)
    .join(' · ');
  return [dateRange, extras].filter(Boolean).join(' · ');
}

const emptyForm = {
  full_name: '',
  headline: '',
  about: '',
  sector: '',
  country: DEFAULT_COUNTRY,
  city: '',
  show_education_in_intro: false,
  intro_education_id: '',
};

export default function EditIntro() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast, showErrorToast } = useNotificationContext();
  const {
    profile,
    loading,
    updateBasicInfo,
    addEducation,
    updateEducation,
    syncEducationIntro,
  } = useCandidateProfile();

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [educationOpen, setEducationOpen] = useState(false);
  const [editingEducation, setEditingEducation] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);

  const initialForm = useMemo(() => {
    if (!user) return emptyForm;
    const identity = readIdentityFromUser(user);
    return {
      full_name: profile?.full_name || identity.full_name || '',
      headline: profile?.headline || '',
      about: profile?.about || '',
      sector: profile?.sector || '',
      country: profile?.country || DEFAULT_COUNTRY,
      city: profile?.city || identity.city || '',
      show_education_in_intro: Boolean(profile?.show_education_in_intro),
      intro_education_id: profile?.intro_education_id || '',
    };
  }, [profile, user]);

  const draftEnabled = Boolean(user?.id) && !loading;
  const {
    values: form,
    setValues: setForm,
    clearDraft,
  } = useFormDraft({
    draftKey: FORM_DRAFT_KEYS.editIntro,
    userId: user?.id,
    initialValues: initialForm,
    enabled: draftEnabled,
    onRestored: (message) => showToast(message || DRAFT_RESTORED_MESSAGE, 'info'),
  });

  const educationModalShowInIntro = Boolean(
    form.show_education_in_intro &&
      editingEducation?.id &&
      String(form.intro_education_id) === String(editingEducation.id),
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

  const openEducation = (item = null) => {
    setEditingEducation(item);
    setEducationOpen(true);
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
      about: form.about.trim() || null,
      sector: form.sector.trim(),
      country: form.country.trim(),
      city: form.city.trim(),
      show_education_in_intro: form.show_education_in_intro,
      intro_education_id: form.show_education_in_intro ? form.intro_education_id || null : null,
    };


    const { error } = await updateBasicInfo(payload);
    setSaving(false);


    if (error) {
      showErrorToast(error, 'save_profile');
      return;
    }

    clearDraft();
    showToast(TOAST.saved, 'success');
    navigate('/personal/profile');
  };

  const saveEducation = async (data, id, options = {}) => {
    setModalSaving(true);
    const result = id ? await updateEducation(id, data) : await addEducation(data);
    if (result.error) {
      setModalSaving(false);
      showErrorToast(result.error, 'save_education');
      return result;
    }
    if (!id && !result.data?.id) {
      setModalSaving(false);
      const err = { message: 'No hemos podido confirmar el guardado. Inténtalo de nuevo.' };
      showToast(err.message, 'error');
      return { data: null, error: err };
    }

    const educationId = id || result.data?.id;
    if (typeof options.showInIntro === 'boolean' && educationId) {
      const showInIntro = options.showInIntro;
      const introResult = await syncEducationIntro(educationId, showInIntro);
      if (introResult.error) {
        setModalSaving(false);
        showErrorToast(introResult.error, 'save_education');
        return introResult;
      }
      setForm((prev) => {
        if (showInIntro) {
          return {
            ...prev,
            intro_education_id: educationId,
            show_education_in_intro: true,
          };
        }
        if (String(prev.intro_education_id) === String(educationId)) {
          return {
            ...prev,
            intro_education_id: '',
            show_education_in_intro: false,
          };
        }
        return prev;
      });
    }

    setModalSaving(false);
    showToast('Educación guardada.', 'success');
    return result;
  };

  if (loading && !profile) {
    return (
      <FormPageLayout title="Editar intro" backButton>
        <FormPageSkeleton fields={5} />
      </FormPageLayout>
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

          <EditIntroSection title="Sobre mí">
            <Textarea
              label="Descripción"
              name="about"
              rows={5}
              value={form.about}
              onChange={setField('about')}
              placeholder="Cuéntanos sobre ti…"
            />
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
              <div className="rounded-radius-md border border-app-border bg-app-surface px-space-md">
                {profile.education.map((item) => (
                  <ProfileEntryRow
                    key={item.id}
                    title={item.institution}
                    subtitle={[item.program, item.specialty].filter(Boolean).join(' · ')}
                    meta={buildEducationMeta(item)}
                    entryIcon={GraduationCap}
                    entryIconTone="education"
                    isOwn
                    onEdit={() => openEducation(item)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-body-small text-app-muted">
                Añade tu formación para mostrarla en la intro.
              </p>
            )}
            {profile?.education?.length ? (
              <Select
                label="Centro educativo principal"
                name="intro_education_id"
                value={form.intro_education_id}
                onChange={setField('intro_education_id')}
                error={errors.intro_education_id}
                options={educationOptions}
              />
            ) : null}
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
            <LocationFields
              country={form.country}
              city={form.city}
              required
              errors={errors}
              onCountryChange={(nextCountry) => {
                setForm((prev) => ({ ...prev, country: nextCountry, city: '' }));
                setErrors((prev) => ({ ...prev, country: undefined, city: undefined }));
              }}
              onCityChange={(nextCity) => {
                setForm((prev) => ({ ...prev, city: nextCity }));
                setErrors((prev) => ({ ...prev, city: undefined }));
              }}
            />
          </EditIntroSection>
        </form>
      </FormPageLayout>

      <EducationModal
        isOpen={educationOpen}
        onClose={() => setEducationOpen(false)}
        initial={editingEducation}
        onSave={saveEducation}
        loading={modalSaving}
        userId={user?.id}
        showInIntro={educationModalShowInIntro}
      />
    </>
  );
}
