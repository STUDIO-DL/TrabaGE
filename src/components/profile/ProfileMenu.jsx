import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { LogOut, MoreVertical, Settings, Trash2, ICON_SIZES } from '../../constants/icons';
import { useAuth } from '../../hooks/useAuth';
import { getHelpPath } from '../../data/help-center';

export default function ProfileMenu({ onSettings, onLogout, onDeleteAccount }) {
  const { role, user } = useAuth();
  const helpPath = getHelpPath(role);
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
    { type: 'action', label: 'Configuración', icon: Settings, onClick: () => run(onSettings) },
    { type: 'link', label: 'Política de privacidad', to: '/legal/privacy' },
    { type: 'link', label: 'Términos de uso', to: '/legal/terms' },
    { type: 'link', label: 'Centro de ayuda', to: helpPath },
    { type: 'divider' },
    { type: 'action', label: 'Cerrar sesión', icon: LogOut, onClick: () => run(onLogout) },
    {
      type: 'action',
      label: 'Eliminar cuenta',
      icon: Trash2,
      onClick: () => run(onDeleteAccount),
      danger: true,
    },
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
        <AppIcon icon={MoreVertical} size={ICON_SIZES.default} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          {user?.email && (
            <>
              <div className="px-4 py-2.5">
                <p className="text-xs text-gray-400">Sesión activa</p>
                <p className="truncate text-sm font-medium text-gray-900">{user.email}</p>
              </div>
              <hr className="my-1 border-gray-100" />
            </>
          )}
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
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${
                  item.danger ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                {item.icon && (
                  <AppIcon
                    icon={item.icon}
                    size={ICON_SIZES.sm}
                    className={item.danger ? 'text-red-600' : 'text-gray-500'}
                  />
                )}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
