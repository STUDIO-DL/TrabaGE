import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import AppIcon from '../../common/AppIcon';
import { LogOut, X, ICON_SIZES } from '../../../constants/icons';

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm, loading }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="¿Cerrar sesión?">
      <p className="text-sm text-gray-600">
        ¿Seguro que quieres cerrar sesión?
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Button variant="primary" fullWidth loading={loading} onClick={onConfirm} className="gap-2">
          <AppIcon icon={LogOut} size={ICON_SIZES.default} className="text-white" />
          Sí, cerrar sesión
        </Button>
        <Button variant="ghost" fullWidth onClick={onClose} className="gap-2">
          <AppIcon icon={X} size={ICON_SIZES.default} />
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}
