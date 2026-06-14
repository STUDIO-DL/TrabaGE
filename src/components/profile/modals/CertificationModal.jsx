import { useEffect, useState } from 'react';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

const empty = { name: '', issuer: '', issued_date: '' };

export default function CertificationModal({ isOpen, onClose, initial, onSave, loading }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(
        initial
          ? {
              name: initial.name || '',
              issuer: initial.issuer || '',
              issued_date: initial.issued_date || '',
            }
          : empty,
      );
      setError('');
    }
  }, [isOpen, initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    const payload = { ...form, issued_date: form.issued_date || null };
    const { error: saveError } = await onSave(payload, initial?.id);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Editar certificación' : 'Añadir certificación'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input label="Emisor" value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} />
        <Input label="Fecha" type="date" value={form.issued_date} onChange={(e) => setForm({ ...form, issued_date: e.target.value })} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth loading={loading}>
          Guardar
        </Button>
      </form>
    </Modal>
  );
}
