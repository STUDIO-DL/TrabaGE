import { useEffect, useMemo, useState } from 'react';
import Modal from '../../ui/Modal';
import Select from '../../ui/Select';
import Button from '../../ui/Button';
import AppIcon from '../../common/AppIcon';
import { Save, ICON_SIZES } from '../../../constants/icons';
import { LANGUAGE_LEVELS } from '../../../constants/languageLevels';
import { PROFILE_LANGUAGE_OPTIONS } from '../../../constants/languages';

const empty = { language: '', level: '' };

export default function LanguageModal({ isOpen, onClose, initial, onSave, loading, existingLanguages = [] }) {
  const [form, setForm] = useState(empty);
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
    if (isOpen) {
      setForm(
        initial
          ? { language: initial.language || '', level: initial.level || '' }
          : empty,
      );
      setError('');
    }
  }, [isOpen, initial]);

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
      setError(saveError.message);
      return;
    }
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth loading={loading} className="gap-2">
          <AppIcon icon={Save} size={ICON_SIZES.default} className="text-white" />
          Guardar
        </Button>
      </form>
    </Modal>
  );
}
