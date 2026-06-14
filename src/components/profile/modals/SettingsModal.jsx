import { useEffect, useState } from 'react';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Button from '../../ui/Button';
import { CITIES } from '../../../constants/cities';

export default function SettingsModal({ isOpen, onClose, profile, onSave, loading }) {
  const [city, setCity] = useState('');

  useEffect(() => {
    if (isOpen) setCity(profile?.city || '');
  }, [isOpen, profile?.city]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await onSave({ city: city || null });
    if (!error) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configuración">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Ciudad"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          options={[{ value: '', label: 'Seleccionar' }, ...CITIES.map((c) => ({ value: c, label: c }))]}
        />
        <p className="text-xs text-gray-500">
          Más opciones de cuenta estarán disponibles próximamente.
        </p>
        <Button type="submit" fullWidth loading={loading}>
          Guardar cambios
        </Button>
      </form>
    </Modal>
  );
}
