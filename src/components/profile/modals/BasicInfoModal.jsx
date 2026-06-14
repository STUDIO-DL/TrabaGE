import { useEffect, useState } from 'react';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Textarea from '../../ui/Textarea';
import Select from '../../ui/Select';
import Button from '../../ui/Button';
import { CITIES } from '../../../constants/cities';

const empty = { full_name: '', headline: '', about: '', city: '' };

export default function BasicInfoModal({ isOpen, onClose, profile, onSave, loading }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && profile) {
      setForm({
        full_name: profile.full_name || '',
        headline: profile.headline || '',
        about: profile.about || '',
        city: profile.city || '',
      });
      setError('');
    }
  }, [isOpen, profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    const { error: saveError } = await onSave(form);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Información básica">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre completo"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          required
        />
        <Input
          label="Titular profesional"
          value={form.headline}
          onChange={(e) => setForm({ ...form, headline: e.target.value })}
        />
        <Textarea
          label="Sobre mí"
          value={form.about}
          onChange={(e) => setForm({ ...form, about: e.target.value })}
          rows={4}
        />
        <Select
          label="Ciudad"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          options={[{ value: '', label: 'Seleccionar' }, ...CITIES.map((c) => ({ value: c, label: c }))]}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth loading={loading}>
          Guardar
        </Button>
      </form>
    </Modal>
  );
}
