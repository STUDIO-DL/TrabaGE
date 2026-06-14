import Modal from '../../ui/Modal';
import Button from '../../ui/Button';

export default function DeleteAccountModal({ isOpen, onClose, onConfirm, loading }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar cuenta">
      <p className="text-sm text-gray-600">
        Esta acción es permanente. Se eliminarán tu perfil, aplicaciones y todos los datos
        asociados. ¿Estás seguro?
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Button variant="danger" fullWidth loading={loading} onClick={onConfirm}>
          Sí, eliminar mi cuenta
        </Button>
        <Button variant="ghost" fullWidth onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}
