import { useEffect, useState } from 'react';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Button from '../../ui/Button';
import { LANGUAGE_LEVELS } from '../../../constants/languageLevels';

const empty = { language: '', level: '' };

export default function LanguageModal({ isOpen, onClose, initial, onSave, loading }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

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
      setError('El idioma es obligatorio.');
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
        <Input label="Idioma" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} required />
        <Select
          label="Nivel"
          value={form.level}
          onChange={(e) => setForm({ ...form, level: e.target.value })}
          options={[{ value: '', label: 'Seleccionar' }, ...LANGUAGE_LEVELS]}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth loading={loading}>
          Guardar
        </Button>
      </form>
    </Modal>
  );
}
