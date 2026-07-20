import { useCallback, useState } from 'react';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Textarea from '../../ui/Textarea';
import Button from '../../ui/Button';
import AppIcon from '../../common/AppIcon';
import { Save, ICON_SIZES } from '../../../constants/icons';
import { FORM_DRAFT_KEYS } from '../../../constants/formDrafts';
import { useAuth } from '../../../hooks/useAuth';
import { useFormDraft } from '../../../hooks/useFormDraft';

const empty = {
  company: '',
  position: '',
  location: '',
  description: '',
  start_date: '',
  end_date: '',
  is_current: false,
};

function buildInitialForm(initial) {
  if (!initial) return empty;
  return {
    company: initial.company || '',
    position: initial.position || '',
    location: initial.location || '',
    description: initial.description || '',
    start_date: initial.start_date || '',
    end_date: initial.end_date || '',
    is_current: !initial.end_date,
  };
}

export default function ExperienceModal({ isOpen, onClose, initial, onSave, loading }) {
  const { user } = useAuth();
  const draftKey = FORM_DRAFT_KEYS.experienceModal(initial?.id);
  const initialForm = buildInitialForm(initial);

  const { values: form, setValues: setForm, clearDraft } = useFormDraft({
    draftKey,
    userId: user?.id,
    initialValues: initialForm,
    enabled: isOpen && Boolean(user?.id),
  });

  const [error, setError] = useState('');

  const updateForm = useCallback(
    (patch) => setForm((prev) => ({ ...prev, ...patch })),
    [setForm],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company.trim() || !form.position.trim()) {
      setError('Empresa y puesto son obligatorios.');
      return;
    }
    const payload = {
      company: form.company,
      position: form.position,
      location: form.location || null,
      description: form.description,
      start_date: form.start_date || null,
      end_date: form.is_current ? null : form.end_date || null,
    };
    const { error: saveError } = await onSave(payload, initial?.id);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    clearDraft();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Editar experiencia' : 'Añadir experiencia'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Puesto"
          value={form.position}
          onChange={(e) => updateForm({ position: e.target.value })}
          required
        />
        <Input
          label="Empresa"
          value={form.company}
          onChange={(e) => updateForm({ company: e.target.value })}
          required
        />
        <Input
          label="Ubicación"
          value={form.location}
          onChange={(e) => updateForm({ location: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Inicio"
            type="date"
            value={form.start_date}
            onChange={(e) => updateForm({ start_date: e.target.value })}
          />
          <Input
            label="Fin"
            type="date"
            value={form.end_date}
            disabled={form.is_current}
            onChange={(e) => updateForm({ end_date: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-app-text">
          <input
            type="checkbox"
            checked={form.is_current}
            onChange={(e) => updateForm({ is_current: e.target.checked, end_date: e.target.checked ? '' : form.end_date })}
          />
          Trabajo aquí actualmente
        </label>
        <Textarea
          label="Descripción"
          rows={4}
          value={form.description}
          onChange={(e) => updateForm({ description: e.target.value })}
        />
        {error && (
          <p className="text-sm text-error-600" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" fullWidth loading={loading} className="gap-2">
          <AppIcon icon={Save} size={ICON_SIZES.default} className="text-white" />
          Guardar
        </Button>
      </form>
    </Modal>
  );
}
