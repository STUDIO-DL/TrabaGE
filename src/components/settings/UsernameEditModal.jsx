import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { AtSign } from '../../constants/icons';
import { usernameService } from '../../services/username.service';
import { stripUsernameAt, validateUsername } from '../../utils/username';
import { GUEST_MODE_MESSAGE } from '../../utils/guestMode';

export default function UsernameEditModal({
  isOpen,
  onClose,
  currentUsername,
  isPreviewMode,
  onSaved,
  showToast,
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue(stripUsernameAt(currentUsername) || '');
      setError(null);
      setSaving(false);
    }
  }, [isOpen, currentUsername]);

  const handleSave = async () => {
    if (isPreviewMode) {
      showToast?.(GUEST_MODE_MESSAGE, 'info');
      return;
    }

    const validation = validateUsername(value);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setSaving(true);
    setError(null);
    const { data, error: saveError } = await usernameService.setMyUsername(validation.value);
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    showToast?.('Nombre de usuario actualizado.', 'success');
    onSaved?.(data);
    onClose?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nombre de usuario" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-app-muted">
          Tu enlace público será{' '}
          <span className="font-medium text-app-text">
            trabage.org/@{stripUsernameAt(value) || 'usuario'}
          </span>
        </p>
        <Input
          label="Nombre de usuario"
          icon={AtSign}
          value={value}
          onChange={(e) => {
            setValue(stripUsernameAt(e.target.value));
            setError(null);
          }}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={30}
          error={error}
        />
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="button" variant="primary" fullWidth className="sm:flex-1" loading={saving} onClick={handleSave}>
            Guardar
          </Button>
          <Button type="button" variant="secondary" fullWidth className="sm:flex-1" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
