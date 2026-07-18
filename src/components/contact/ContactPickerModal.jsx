import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * Bottom sheet to choose between multiple contact methods.
 * Reusable across personal, business and organization profiles.
 */
export default function ContactPickerModal({
  isOpen,
  onClose,
  methods = [],
  onSelect,
  title = '¿Cómo deseas contactar con este usuario?',
}) {
  const handleSelect = (methodId) => {
    onSelect?.(methodId);
    onClose?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} variant="sheet" size="sm">
      <div className="flex flex-col gap-space-sm">
        {methods.map((method) => (
          <Button
            key={method.id}
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => handleSelect(method.id)}
            className="justify-start gap-space-md px-space-base py-space-md text-left"
          >
            <span className="text-xl leading-none" aria-hidden>
              {method.emoji}
            </span>
            <span className="text-body font-medium">{method.label}</span>
          </Button>
        ))}
      </div>
    </Modal>
  );
}
