import { useEffect, useState } from 'react';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Textarea from '../../ui/Textarea';
import Button from '../../ui/Button';
import AppIcon from '../../common/AppIcon';
import { Save, ICON_SIZES } from '../../../constants/icons';

const empty = {
  company: '',
  position: '',
  description: '',
  start_date: '',
  end_date: '',
  is_current: false,
};

export default function ExperienceModal({ isOpen, onClose, initial, onSave, loading }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(
        initial
          ? {
              company: initial.company || '',
              position: initial.position || '',
              description: initial.description || '',
              start_date: initial.start_date || '',
              end_date: initial.end_date || '',
              is_current: !initial.end_date,
            }
          : empty,
      );
      setError('');
    }
  }, [isOpen, initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company.trim() || !form.position.trim()) {
      setError('Empresa y puesto son obligatorios.');
      return;
    }
    const payload = {
      company: form.company,
      position: form.position,
      description: form.description,
      start_date: form.start_date || null,
      end_date: form.is_current ? null : form.end_date || null,
    };
    const { error: saveError } = await onSave(payload, initial?.id);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Editar experiencia' : 'Añadir experiencia'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Puesto" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} required />
        <Input label="Empresa" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Inicio"
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />
          <Input
            label="Fin"
            type="date"
            value={form.end_date}
            disabled={form.is_current}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
          <input
            type="checkbox"
            checked={form.is_current}
            onChange={(e) =>
              setForm({
                ...form,
                is_current: e.target.checked,
                end_date: e.target.checked ? '' : form.end_date,
              })
            }
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Sigo trabajando aquí</span>
        </label>
        <Textarea label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth loading={loading} className="gap-2">
          <AppIcon icon={Save} size={ICON_SIZES.default} className="text-white" />
          Guardar
        </Button>
      </form>
    </Modal>
  );
}
