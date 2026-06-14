import { useEffect, useState } from 'react';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Textarea from '../../ui/Textarea';
import Button from '../../ui/Button';

const empty = {
  company: '',
  position: '',
  description: '',
  start_date: '',
  end_date: '',
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
      ...form,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
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
          <Input label="Inicio" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          <Input label="Fin" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </div>
        <Textarea label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth loading={loading}>
          Guardar
        </Button>
      </form>
    </Modal>
  );
}
