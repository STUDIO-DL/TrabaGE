import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { LegalInlineLink } from '../legal/LegalLinks';
import { LEGAL_ROUTES } from '../../constants/legalRoutes';

/**
 * Gate before uploading a Business/Organization logo:
 * user must declare trademark ownership / authorization.
 */
export default function BrandLogoOwnershipModal({
  isOpen,
  onClose,
  onConfirm,
}) {
  const [accepted, setAccepted] = useState(false);

  const handleClose = () => {
    setAccepted(false);
    onClose?.();
  };

  const handleConfirm = () => {
    if (!accepted) return;
    setAccepted(false);
    onConfirm?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Uso del logotipo" size="sm">
      <p className="text-body-small leading-relaxed text-app-muted">
        Antes de subir el logotipo de tu cuenta Business u Organización, confirma que eres el
        titular legítimo de la marca o que cuentas con autorización para mostrarla en TrabaGE.
      </p>

      <label className="mt-space-base flex cursor-pointer items-start gap-space-sm">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded-radius-sm border-app-border text-primary-600 focus:ring-primary-500"
        />
        <span className="text-caption leading-relaxed text-app-text">
          Declaro ser el titular legítimo de esta marca o disponer de autorización suficiente para
          subir y mostrar este logotipo en TrabaGE. He leído la sección sobre logotipos en los{' '}
          <LegalInlineLink to={LEGAL_ROUTES.termsLogoPolicy}>
            Términos y Condiciones
          </LegalInlineLink>
          .
        </span>
      </label>

      <div className="mt-space-xl flex flex-col gap-space-sm sm:flex-row-reverse">
        <Button fullWidth disabled={!accepted} onClick={handleConfirm}>
          Continuar y elegir archivo
        </Button>
        <Button fullWidth variant="secondary" onClick={handleClose}>
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}
