import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import AppIcon from '../../common/AppIcon';
import { Save, Trash2, X, ICON_SIZES } from '../../../constants/icons';

export default function DeleteAccountModal({ isOpen, onClose, onConfirm, loading }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar cuenta">
      <p className="text-sm text-gray-600">
        Esta acción es permanente. Se eliminarán tu perfil, aplicaciones y todos los datos
        asociados. ¿Estás seguro?
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Button variant="danger" fullWidth loading={loading} onClick={onConfirm} className="gap-2">
          <AppIcon icon={Trash2} size={ICON_SIZES.default} className="text-white" />
          Sí, eliminar mi cuenta
        </Button>
        <Button variant="ghost" fullWidth onClick={onClose} className="gap-2">
          <AppIcon icon={X} size={ICON_SIZES.default} />
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}
