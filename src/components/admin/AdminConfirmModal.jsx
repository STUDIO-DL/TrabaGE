import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * Reusable destructive / irreversible action confirmation for admin panel.
 */
export default function AdminConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = '¿Confirmar acción?',
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      {description && <p className="text-sm text-gray-600">{description}</p>}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={variant} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
