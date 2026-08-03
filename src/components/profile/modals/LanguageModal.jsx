import { useEffect, useMemo, useState } from 'react';
import { getUserErrorMessage, ERROR_ACTION } from '../../../utils/userFacingError';
import Modal from '../../ui/Modal';
import Select from '../../ui/Select';
import Button from '../../ui/Button';
import AppIcon from '../../common/AppIcon';
import { Save, ICON_SIZES } from '../../../constants/icons';
import { LANGUAGE_LEVELS } from '../../../constants/languageLevels';
import { PROFILE_LANGUAGE_OPTIONS } from '../../../constants/languages';
import { FORM_DRAFT_KEYS } from '../../../constants/formDrafts';
import { DRAFT_RESTORED_MESSAGE, useFormDraft } from '../../../hooks/useFormDraft';
import { useNotificationContext } from '../../../context/NotificationContext';
import { useAuth } from '../../../hooks/useAuth';

const empty = { language: '', level: '' };

export default function LanguageModal({
  isOpen,
  onClose,
  initial,
  onSave,
  loading,
  existingLanguages = [],
}) {
  const { user } = useAuth();
  const { showToast } = useNotificationContext();
  const draftKey = FORM_DRAFT_KEYS.languageModal(initial?.id);
  const initialForm = initial
    ? { language: initial.language || '', level: initial.level || '' }
    : empty;
  const {
    values: form,
    setValues: setForm,
    clearDraft,
  } = useFormDraft({
    draftKey,
    userId: user?.id,
    initialValues: initialForm,
    enabled: isOpen && Boolean(user?.id),
    onRestored: (message) => showToast(message || DRAFT_RESTORED_MESSAGE, 'info'),
  });
  const [error, setError] = useState('');

  const usedLanguages = useMemo(
    () =>
      new Set(
        existingLanguages
          .filter((item) => !initial || item.id !== initial.id)
          .map((item) => item.language?.trim())
          .filter(Boolean),
      ),
    [existingLanguages, initial],
  );

  const languageOptions = useMemo(
    () => [
      { value: '', label: 'Seleccionar idioma' },
      ...PROFILE_LANGUAGE_OPTIONS.filter((option) => !usedLanguages.has(option.value)),
    ],
    [usedLanguages],
  );

  useEffect(() => {
    if (isOpen) setError('');
  }, [isOpen, draftKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.language.trim()) {
      setError('Selecciona un idioma.');
      return;
    }
    if (usedLanguages.has(form.language.trim())) {
      setError('Este idioma ya está en tu perfil.');
      return;
    }
    const { error: saveError } = await onSave(form, initial?.id);
    if (saveError) {
      setError(getUserErrorMessage(saveError, ERROR_ACTION.save_language));
      return;
    }
    clearDraft();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Editar idioma' : 'Añadir idioma'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Idioma"
          value={form.language}
          onChange={(e) => setForm({ ...form, language: e.target.value })}
          options={languageOptions}
          required
        />
        <Select
          label="Nivel (opcional)"
          value={form.level}
          onChange={(e) => setForm({ ...form, level: e.target.value })}
          options={[{ value: '', label: 'Seleccionar' }, ...LANGUAGE_LEVELS]}
        />
        {error ? <p className="text-sm text-error-600">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-full gap-1.5">
          <AppIcon icon={Save} size={ICON_SIZES.sm} className="text-white" />
          Guardar
        </Button>
      </form>
    </Modal>
  );
}
