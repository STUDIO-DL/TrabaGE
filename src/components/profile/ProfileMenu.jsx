import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconDots } from './ProfileIcons';

export default function ProfileMenu({ onSettings, onLogout, onDeleteAccount }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const run = (fn) => {
    setOpen(false);
    fn?.();
  };

  const items = [
    { type: 'action', label: 'Configuración', onClick: () => run(onSettings) },
    { type: 'link', label: 'Política de privacidad', to: '/legal/privacy' },
    { type: 'link', label: 'Términos de uso', to: '/legal/terms' },
    { type: 'link', label: 'Centro de ayuda', to: '/legal/help' },
    { type: 'divider' },
    { type: 'action', label: 'Cerrar sesión', onClick: () => run(onLogout) },
    { type: 'action', label: 'Eliminar cuenta', onClick: () => run(onDeleteAccount), danger: true },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
        aria-label="Menú"
        aria-expanded={open}
      >
        <IconDots className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          {items.map((item, i) => {
            if (item.type === 'divider') {
              return <hr key={i} className="my-1 border-gray-100" />;
            }
            if (item.type === 'link') {
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${
                  item.danger ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
