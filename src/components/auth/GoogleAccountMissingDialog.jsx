import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { GOOGLE_NO_ACCOUNT_MESSAGE, GOOGLE_NO_ACCOUNT_TITLE } from '../../constants/googleAuth';

export { GOOGLE_NO_ACCOUNT_MESSAGE, GOOGLE_NO_ACCOUNT_TITLE };

export default function GoogleAccountMissingDialog({
  isOpen,
  onClose,
  onCreateAccount,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={GOOGLE_NO_ACCOUNT_TITLE} size="sm">
      <p className="whitespace-pre-line text-body-small leading-relaxed text-app-muted">
        {GOOGLE_NO_ACCOUNT_MESSAGE}
      </p>
      <div className="mt-space-lg flex flex-col gap-space-sm sm:flex-row-reverse">
        <Button fullWidth size="md" className="!rounded-radius-md" onClick={onCreateAccount}>
          Crear cuenta
        </Button>
        <Button
          variant="secondary"
          fullWidth
          size="md"
          className="!rounded-radius-md"
          onClick={onClose}
        >
          Volver
        </Button>
      </div>
    </Modal>
  );
}
