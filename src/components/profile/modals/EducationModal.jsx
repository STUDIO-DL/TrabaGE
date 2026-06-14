import { useEffect, useState } from 'react';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

const empty = {
  institution: '',
  program: '',
  grade: '',
  start_date: '',
  end_date: '',
};

export default function EducationModal({ isOpen, onClose, initial, onSave, loading }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(
        initial
          ? {
              institution: initial.institution || '',
              program: initial.program || '',
              grade: initial.grade || '',
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
    if (!form.institution.trim()) {
      setError('La institución es obligatoria.');
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
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Editar educación' : 'Añadir educación'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Institución" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} required />
        <Input label="Programa / título" value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} />
        <Input label="Nota / grado" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Inicio" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          <Input label="Fin" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth loading={loading}>
          Guardar
        </Button>
      </form>
    </Modal>
  );
}
