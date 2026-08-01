import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * Confirmation before permanently deleting an owned post.
 */
export default function DeletePostConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar publicación" size="sm">
      <div className="space-y-space-sm text-body-small text-app-muted">
        <p>¿Seguro que deseas eliminar esta publicación?</p>
        <p>Esta acción es permanente y no se puede deshacer.</p>
      </div>
      <div className="mt-space-lg flex flex-col gap-space-sm sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>
          Eliminar
        </Button>
      </div>
    </Modal>
  );
}
