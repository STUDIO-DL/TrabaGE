import Button from '../ui/Button';
import BottomSheet from '../ui/BottomSheet';

/**
 * Confirm soft-delete for selected own message(s).
 */
export default function DeleteMessageSheet({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  count = 1,
}) {
  const title = count > 1 ? 'Eliminar mensajes' : 'Eliminar mensaje';
  const body =
    count > 1
      ? `¿Seguro que deseas eliminar estos ${count} mensajes?`
      : '¿Seguro que deseas eliminar este mensaje?';

  return (
    <BottomSheet isOpen={isOpen} onClose={loading ? undefined : onClose} title={title}>
      <p className="text-body-small leading-relaxed text-app-muted">{body}</p>
      <div className="mt-space-lg flex flex-col gap-space-sm sm:flex-row-reverse">
        <Button
          fullWidth
          variant="danger"
          loading={loading}
          disabled={loading}
          onClick={onConfirm}
          className="!rounded-radius-md"
        >
          Eliminar
        </Button>
        <Button
          fullWidth
          variant="secondary"
          disabled={loading}
          onClick={onClose}
          className="!rounded-radius-md"
        >
          Cancelar
        </Button>
      </div>
    </BottomSheet>
  );
}
