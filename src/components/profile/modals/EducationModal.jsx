import { useEffect, useId, useState } from 'react';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Textarea from '../../ui/Textarea';
import InstitutionAutocomplete from '../../ui/InstitutionAutocomplete';
import MonthYearSelect from '../../ui/MonthYearSelect';
import Button from '../../ui/Button';
import KeyboardAwareFooter from '../../layout/KeyboardAwareFooter';
import AppIcon from '../../common/AppIcon';
import { Save, ICON_SIZES } from '../../../constants/icons';
import SkillTagsField from '../education/SkillTagsField';
import EducationFilesField, { MAX_EDUCATION_FILES } from '../education/EducationFilesField';
import {
  compareMonthYear,
  parseMonthYear,
  toEndDate,
  toStartDate,
} from '../../../utils/educationDates';
import { storageService } from '../../../services/storage.service';

const ACTIVITIES_MAX = 500;
const DESCRIPTION_MAX = 1000;

const emptyForm = {
  institution: '',
  program: '',
  specialty: '',
  grade: '',
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  is_current: false,
  activities: '',
  description: '',
  skills: [],
};

function normalizeMediaFiles(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object' && item.path)
    .map((item) => ({
      path: item.path,
      name: item.name || 'Archivo',
      size: item.size ?? 0,
      mimeType: item.mimeType || item.mime_type || null,
    }));
}

function buildFormState(initial) {
  if (!initial) return emptyForm;
  const start = parseMonthYear(initial.start_date);
  const end = parseMonthYear(initial.end_date);
  const isCurrent = Boolean(initial.is_current ?? !initial.end_date);

  return {
    institution: initial.institution || '',
    program: initial.program || '',
    specialty: initial.specialty || '',
    grade: initial.grade || '',
    startMonth: start.month,
    startYear: start.year,
    endMonth: isCurrent ? '' : end.month,
    endYear: isCurrent ? '' : end.year,
    is_current: isCurrent,
    activities: initial.activities || '',
    description: initial.description || '',
    skills: Array.isArray(initial.skills) ? initial.skills : [],
  };
}

function validateForm(form, existingFiles, pendingFiles) {
  const errors = {};

  if (!form.institution.trim()) {
    errors.institution = 'La institución es obligatoria.';
  }
  if (!form.program.trim()) {
    errors.program = 'El título o grado es obligatorio.';
  }
  if (!form.startMonth || !form.startYear) {
    errors.start_date = 'La fecha de inicio es obligatoria.';
  }
  if (!form.is_current && (!form.endMonth || !form.endYear)) {
    errors.end_date = 'Indica la fecha de fin o marca que sigues estudiando aquí.';
  }
  if (
    !form.is_current &&
    form.startMonth &&
    form.startYear &&
    form.endMonth &&
    form.endYear &&
    compareMonthYear(form.endMonth, form.endYear, form.startMonth, form.startYear) < 0
  ) {
    errors.end_date = 'La fecha de fin no puede ser anterior a la de inicio.';
  }
  if (form.activities.length > ACTIVITIES_MAX) {
    errors.activities = `Máximo ${ACTIVITIES_MAX} caracteres.`;
  }
  if (form.description.length > DESCRIPTION_MAX) {
    errors.description = `Máximo ${DESCRIPTION_MAX} caracteres.`;
  }
  if (existingFiles.length + pendingFiles.length > MAX_EDUCATION_FILES) {
    errors.files = `Máximo ${MAX_EDUCATION_FILES} archivos.`;
  }

  return errors;
}

export default function EducationModal({
  isOpen,
  onClose,
  initial,
  onSave,
  loading,
  userId,
}) {
  const formId = useId();
  const [form, setForm] = useState(emptyForm);
  const [existingFiles, setExistingFiles] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [removedPaths, setRemovedPaths] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(buildFormState(initial));
    setExistingFiles(normalizeMediaFiles(initial?.media_files));
    setPendingFiles([]);
    setRemovedPaths([]);
    setFieldErrors({});
    setSubmitError('');
  }, [isOpen, initial]);

  const busy = loading || uploading;

  const setField = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setFieldErrors((current) => {
      const next = { ...current };
      Object.keys(patch).forEach((key) => delete next[key]);
      return next;
    });
  };

  const handleAddPendingFile = (file, errorMessage) => {
    if (errorMessage) {
      setFieldErrors((current) => ({ ...current, files: errorMessage }));
      return;
    }
    if (!file) return;
    setPendingFiles((current) => [
      ...current,
      { clientId: crypto.randomUUID(), file, name: file.name, size: file.size, type: file.type },
    ]);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.files;
      return next;
    });
  };

  const syncMediaFiles = async (educationId) => {
    if (!userId || !educationId) return { mediaFiles: existingFiles, error: null };

    let nextFiles = existingFiles.filter((file) => !removedPaths.includes(file.path));

    if (removedPaths.length) {
      const { error } = await storageService.deleteEducationFiles(removedPaths);
      if (error) return { mediaFiles: null, error };
    }

    for (const pending of pendingFiles) {
      const fileId = crypto.randomUUID();
      const { meta, error } = await storageService.uploadEducationFile(
        userId,
        educationId,
        pending.file,
        fileId,
      );
      if (error) return { mediaFiles: null, error };
      nextFiles = [...nextFiles, meta];
    }

    return { mediaFiles: nextFiles, error: null };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    const errors = validateForm(form, existingFiles, pendingFiles);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    const payload = {
      institution: form.institution.trim(),
      program: form.program.trim(),
      specialty: form.specialty.trim() || null,
      grade: form.grade.trim() || null,
      start_date: toStartDate(form.startMonth, form.startYear),
      end_date: form.is_current ? null : toEndDate(form.endMonth, form.endYear),
      is_current: form.is_current,
      activities: form.activities.trim() || null,
      description: form.description.trim() || null,
      skills: form.skills,
      media_files: existingFiles.filter((file) => !removedPaths.includes(file.path)),
    };

    setUploading(true);
    const { data, error: saveError } = await onSave(payload, initial?.id);
    if (saveError) {
      setUploading(false);
      setSubmitError(saveError.message);
      return;
    }

    const educationId = data?.id || initial?.id;
    if (educationId && (pendingFiles.length || removedPaths.length)) {
      const { mediaFiles, error: mediaError } = await syncMediaFiles(educationId);
      if (mediaError) {
        setUploading(false);
        setSubmitError('No se pudieron subir los archivos. Inténtalo de nuevo.');
        return;
      }

      const { error: patchError } = await onSave({ media_files: mediaFiles }, educationId, {
        silent: true,
      });
      setUploading(false);
      if (patchError) {
        setSubmitError(patchError.message);
        return;
      }
    } else {
      setUploading(false);
    }

    onClose();
  };

  const activitiesCount = form.activities.length;
  const descriptionCount = form.description.length;

  const title = initial ? 'Editar educación' : 'Añadir educación';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant="sheet"
      size="lg"
      footerAware
    >
      <form
        id={formId}
        onSubmit={handleSubmit}
        className="-mx-space-base flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="min-h-0 flex-1 space-y-space-md overflow-y-auto overflow-x-hidden overscroll-contain px-space-base pb-space-md [-webkit-overflow-scrolling:touch]">
          <InstitutionAutocomplete
            label="Institución educativa"
            value={form.institution}
            onChange={(institution) => setField({ institution })}
            required
            error={fieldErrors.institution}
          />

          <Input
            label="Título / Grado"
            value={form.program}
            onChange={(event) => setField({ program: event.target.value })}
            required
            error={fieldErrors.program}
            placeholder="Ej. Grado en Ingeniería Informática"
          />

          <Input
            label="Campo de estudio"
            value={form.specialty}
            onChange={(event) => setField({ specialty: event.target.value })}
            placeholder="Ej. Informática, Derecho, Marketing"
          />

          <MonthYearSelect
            label="Fecha inicio"
            idPrefix="education-start"
            month={form.startMonth}
            year={form.startYear}
            onMonthChange={(startMonth) => setField({ startMonth })}
            onYearChange={(startYear) => setField({ startYear })}
            required
            error={fieldErrors.start_date}
          />

          <MonthYearSelect
            label="Fecha fin"
            idPrefix="education-end"
            month={form.endMonth}
            year={form.endYear}
            onMonthChange={(endMonth) => setField({ endMonth })}
            onYearChange={(endYear) => setField({ endYear })}
            disabled={form.is_current}
            error={fieldErrors.end_date}
          />

          <label className="flex min-h-touch cursor-pointer items-center gap-space-sm rounded-radius-md border border-app-border bg-app-surface px-space-md py-space-sm">
            <input
              type="checkbox"
              checked={form.is_current}
              onChange={(event) =>
                setField({
                  is_current: event.target.checked,
                  endMonth: event.target.checked ? '' : form.endMonth,
                  endYear: event.target.checked ? '' : form.endYear,
                })
              }
              className="h-4 w-4 rounded border-app-border text-primary-600 focus:ring-primary-500"
            />
            <span className="text-body-small text-app-text">Actualmente estudio aquí</span>
          </label>

          <Input
            label="Calificación"
            value={form.grade}
            onChange={(event) => setField({ grade: event.target.value })}
            placeholder="Ej. 8.5, Sobresaliente, GPA 3.8"
          />

          <div>
            <Textarea
              label="Actividades y sociedades"
              value={form.activities}
              onChange={(event) => setField({ activities: event.target.value.slice(0, ACTIVITIES_MAX) })}
              rows={3}
              maxLength={ACTIVITIES_MAX}
              error={fieldErrors.activities}
              placeholder="Clubes, voluntariado, proyectos universitarios…"
            />
            <p className="mt-space-xs text-right text-caption text-app-subtle" aria-live="polite">
              {activitiesCount}/{ACTIVITIES_MAX}
            </p>
          </div>

          <div>
            <Textarea
              label="Descripción"
              value={form.description}
              onChange={(event) =>
                setField({ description: event.target.value.slice(0, DESCRIPTION_MAX) })
              }
              rows={4}
              maxLength={DESCRIPTION_MAX}
              error={fieldErrors.description}
              placeholder="Describe tu formación, logros académicos o enfoque de estudio…"
            />
            <p className="mt-space-xs text-right text-caption text-app-subtle" aria-live="polite">
              {descriptionCount}/{DESCRIPTION_MAX}
            </p>
          </div>

          <SkillTagsField
            value={form.skills}
            onChange={(skills) => setField({ skills })}
            error={fieldErrors.skills}
          />

          <EducationFilesField
            existingFiles={existingFiles}
            pendingFiles={pendingFiles}
            onAddPending={handleAddPendingFile}
            onRemoveExisting={(path) => {
              setRemovedPaths((current) => [...new Set([...current, path])]);
              setExistingFiles((current) => current.filter((file) => file.path !== path));
            }}
            onRemovePending={(clientId) =>
              setPendingFiles((current) => current.filter((file) => file.clientId !== clientId))
            }
            error={fieldErrors.files}
            disabled={busy}
          />

          {submitError && (
            <p className="text-caption text-error-600" role="alert">
              {submitError}
            </p>
          )}
        </div>

        <KeyboardAwareFooter className="z-10 shrink-0 border-t border-app-border bg-app-card px-space-base pt-space-md">
          <Button type="submit" form={formId} fullWidth loading={busy} className="gap-space-sm">
            <AppIcon icon={Save} size={ICON_SIZES.default} className="text-white" />
            Guardar
          </Button>
        </KeyboardAwareFooter>
      </form>
    </Modal>
  );
}
