import { useCallback, useEffect, useId, useRef, useState } from 'react';
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
import {
  compareMonthYear,
  parseMonthYear,
  toEndDate,
  toStartDate,
} from '../../../utils/educationDates';
import { FORM_DRAFT_KEYS } from '../../../constants/formDrafts';
import { useAuth } from '../../../hooks/useAuth';
import { useFormDraft } from '../../../hooks/useFormDraft';

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
  showInIntro: false,
};

function buildFormState(initial, showInIntro = false) {
  if (!initial) return { ...emptyForm, showInIntro: Boolean(showInIntro) };
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
    showInIntro: Boolean(showInIntro),
  };
}

function validateForm(form) {
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

  return errors;
}

export default function EducationModal({
  isOpen,
  onClose,
  initial,
  onSave,
  loading,
  userId,
  showInIntro = false,
}) {
  const formId = useId();
  const { user } = useAuth();
  const resolvedUserId = userId || user?.id;
  const draftKey = FORM_DRAFT_KEYS.educationModal(initial?.id);

  const draftEnabled = isOpen && Boolean(resolvedUserId);
  const initialForm = buildFormState(initial, showInIntro);
  const { values: form, setValues: setForm, clearDraft } = useFormDraft({
    draftKey,
    userId: resolvedUserId,
    initialValues: initialForm,
    enabled: draftEnabled,
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const prevOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = isOpen && !prevOpenRef.current;
    prevOpenRef.current = isOpen;
    if (!justOpened) return;
    setFieldErrors({});
    setSubmitError('');
    // #region agent log
    fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fe2e54'},body:JSON.stringify({sessionId:'fe2e54',runId:'pre-fix',hypothesisId:'E1',location:'EducationModal.jsx:open',message:'education modal opened',data:{mode:initial?.id?'edit':'add',editingId:initial?.id||null,showInIntroProp:Boolean(showInIntro),draftKey,institution:initialForm.institution||'',formShowInIntro:Boolean(initialForm.showInIntro)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [isOpen, initial, showInIntro, draftKey, initialForm.institution, initialForm.showInIntro]);

  const setField = useCallback((patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setFieldErrors((current) => {
      const next = { ...current };
      Object.keys(patch).forEach((key) => delete next[key]);
      return next;
    });
  }, [setForm]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    const errors = validateForm(form);
    if (Object.keys(errors).length) {
      // #region agent log
      fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fe2e54'},body:JSON.stringify({sessionId:'fe2e54',runId:'pre-fix',hypothesisId:'E4',location:'EducationModal.jsx:validation',message:'education modal validation failed',data:{mode:initial?.id?'edit':'add',errorKeys:Object.keys(errors),errors,institutionLen:(form.institution||'').length,hasStart:Boolean(form.startMonth&&form.startYear),isCurrent:Boolean(form.is_current),showInIntro:Boolean(form.showInIntro)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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
    };

    // #region agent log
    fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fe2e54'},body:JSON.stringify({sessionId:'fe2e54',runId:'pre-fix',hypothesisId:'E1',location:'EducationModal.jsx:submit',message:'education modal submit',data:{mode:initial?.id?'edit':'add',editingId:initial?.id||null,showInIntro:Boolean(form.showInIntro),showInIntroProp:Boolean(showInIntro),institution:payload.institution,program:payload.program,start_date:payload.start_date,end_date:payload.end_date,is_current:payload.is_current,skillsCount:(payload.skills||[]).length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    const { error: saveError } = await onSave(payload, initial?.id, {
      showInIntro: form.showInIntro,
    });
    // #region agent log
    fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fe2e54'},body:JSON.stringify({sessionId:'fe2e54',runId:'pre-fix',hypothesisId:'E2',location:'EducationModal.jsx:afterSave',message:'education modal onSave returned',data:{ok:!saveError,errorMessage:saveError?.message||null,errorCode:saveError?.code||null,showInIntro:Boolean(form.showInIntro)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (saveError) {
      setSubmitError(saveError.message);
      return;
    }

<<<<<<< HEAD
    const educationId = data?.id || initial?.id;
    if (!educationId) {
      setUploading(false);
      setUploadPhase(null);
      setSubmitError('No se pudo confirmar el guardado en el servidor. Inténtalo de nuevo.');
      return;
    }
    if (educationId && (pendingFiles.length || removedPaths.length)) {
      const { mediaFiles, error: mediaError } = await syncMediaFiles(educationId);
      if (mediaError) {
        setUploading(false);
        setUploadPhase(null);
        setSubmitError('No se pudieron subir los archivos. Inténtalo de nuevo.');
        return;
      }

      const { error: patchError } = await onSave({ media_files: mediaFiles }, educationId, {
        silent: true,
      });
      setUploading(false);
      setUploadPhase(null);
      if (patchError) {
        setSubmitError(patchError.message);
        return;
      }
    } else {
      setUploading(false);
      setUploadPhase(null);
    }

=======
    clearDraft();
>>>>>>> bef3757160945b42cbb1dcc1bea46ed6dae0aefc
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

          <label className="flex min-h-touch cursor-pointer items-center gap-space-sm rounded-radius-md border border-app-border bg-app-surface px-space-md py-space-sm">
            <input
              type="checkbox"
              checked={form.showInIntro}
              onChange={(event) => setField({ showInIntro: event.target.checked })}
              className="h-4 w-4 rounded border-app-border text-primary-600 focus:ring-primary-500"
            />
            <span className="text-body-small text-app-text">Mostrar centro en mi intro</span>
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

          {submitError && (
            <p className="text-caption text-error-600" role="alert">
              {submitError}
            </p>
          )}
        </div>

        <KeyboardAwareFooter className="z-10 shrink-0 border-t border-app-border bg-app-card px-space-base pt-space-md">
          <Button type="submit" form={formId} fullWidth loading={loading} className="gap-space-sm">
            <AppIcon icon={Save} size={ICON_SIZES.default} className="text-white" />
            Guardar
          </Button>
        </KeyboardAwareFooter>
      </form>
    </Modal>
  );
}
