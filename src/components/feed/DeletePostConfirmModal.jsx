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
      <p className="text-body-small text-app-muted">
        Esta acción no se puede deshacer. ¿Deseas eliminar esta publicación?
      </p>
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
