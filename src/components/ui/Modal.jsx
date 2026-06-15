import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import AppIcon from '../common/AppIcon';
import { X, ICON_SIZES } from '../../constants/icons';

export default function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Cerrar modal"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 sm:max-w-lg sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <AppIcon icon={X} size={ICON_SIZES.default} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
