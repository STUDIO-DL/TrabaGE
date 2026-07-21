import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

export default function CvIncompleteProfileModal({ isOpen, onClose, onComplete }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Completa tu perfil primero" size="sm">
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-app-muted">
          Para generar un Curriculum Vitae profesional debes completar primero las secciones
          principales de tu perfil.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="button" variant="primary" fullWidth className="sm:flex-1" onClick={onComplete}>
            Completar perfil
          </Button>
          <Button type="button" variant="secondary" fullWidth className="sm:flex-1" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
