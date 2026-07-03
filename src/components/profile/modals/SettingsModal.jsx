import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Button from '../../ui/Button';
import AppIcon from '../../common/AppIcon';
import { Save, ICON_SIZES } from '../../../constants/icons';
import { CITIES } from '../../../constants/cities';
import { LEGAL_ROUTES } from '../../../constants/legalRoutes';

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

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Legal</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link
                to={LEGAL_ROUTES.privacy}
                onClick={onClose}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Política de Privacidad
              </Link>
            </li>
            <li>
              <Link
                to={LEGAL_ROUTES.terms}
                onClick={onClose}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Términos de Uso
              </Link>
            </li>
          </ul>
        </div>

        <Button type="submit" fullWidth loading={loading} className="gap-2">
          <AppIcon icon={Save} size={ICON_SIZES.default} className="text-white" />
          Guardar cambios
        </Button>
      </form>
    </Modal>
  );
}
