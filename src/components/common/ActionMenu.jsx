import { useEffect, useRef, useState } from 'react';
import AppIcon from './AppIcon';
import { AlertTriangle, MoreVertical, Share2, ICON_SIZES } from '../../constants/icons';

export default function ActionMenu({ onShare, onReport, align = 'right', className = '' }) {
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const run = (fn) => {
    setOpen(false);
    fn?.();
  };

  const alignClass = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Más opciones"
        aria-expanded={open}
      >
        <AppIcon icon={MoreVertical} size={ICON_SIZES.default} />
      </button>

      {open && (
        <div
          className={`absolute ${alignClass} top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg`}
        >
          <button
            type="button"
            onClick={() => run(onShare)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <AppIcon icon={Share2} size={ICON_SIZES.sm} className="text-gray-500" />
            Compartir
          </button>
          <button
            type="button"
            onClick={() => run(onReport)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <AppIcon icon={AlertTriangle} size={ICON_SIZES.sm} className="text-amber-600" />
            Reportar
          </button>
        </div>
      )}
    </div>
  );
}
