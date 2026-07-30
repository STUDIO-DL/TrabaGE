import { useEffect, useState } from 'react';
import { getUserErrorMessage, ERROR_ACTION } from '../../../utils/userFacingError';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Textarea from '../../ui/Textarea';
import Select from '../../ui/Select';
import Button from '../../ui/Button';
import AppIcon from '../../common/AppIcon';
import { Save, ICON_SIZES } from '../../../constants/icons';
import {
  CITIES,
  CITY_OTHER_LABEL,
  CITY_OTHER_VALUE,
  getCitySelectValue,
  isListedCity,
} from '../../../constants/cities';

const empty = { full_name: '', headline: '', about: '', city: '' };

export default function BasicInfoModal({ isOpen, onClose, profile, onSave, loading }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [forceOtherCity, setForceOtherCity] = useState(false);

  useEffect(() => {
    if (isOpen && profile) {
      const city = profile.city || '';
      setForm({
        full_name: profile.full_name || '',
        headline: profile.headline || '',
        about: profile.about || '',
        city,
      });
      setForceOtherCity(Boolean(city) && !isListedCity(city));
      setError('');
    }
  }, [isOpen, profile]);

  const citySelectValue = getCitySelectValue(form.city, forceOtherCity);
  const showCustomCity = citySelectValue === CITY_OTHER_VALUE;

  const handleCitySelectChange = (event) => {
    const value = event.target.value;
    if (value === CITY_OTHER_VALUE) {
      setForceOtherCity(true);
      setForm((prev) => ({
        ...prev,
        city: isListedCity(prev.city) ? '' : prev.city,
      }));
      return;
    }
    setForceOtherCity(false);
    setForm((prev) => ({ ...prev, city: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (showCustomCity && !form.city.trim()) {
      setError('Escribe tu ciudad.');
      return;
    }
    const { error: saveError } = await onSave(form);
    if (saveError) {
      setError(getUserErrorMessage(saveError, ERROR_ACTION.save_profile));
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
          value={citySelectValue}
          onChange={handleCitySelectChange}
          options={[
            { value: '', label: 'Seleccionar' },
            ...CITIES.map((c) => ({ value: c, label: c })),
            { value: CITY_OTHER_VALUE, label: CITY_OTHER_LABEL },
          ]}
        />
        {showCustomCity ? (
          <Input
            label="Escribe tu ciudad"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            required
            placeholder="Ciudad fuera de Guinea Ecuatorial"
          />
        ) : null}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" fullWidth loading={loading} className="gap-2">
          <AppIcon icon={Save} size={ICON_SIZES.default} className="text-white" />
          Guardar
        </Button>
      </form>
    </Modal>
  );
}
