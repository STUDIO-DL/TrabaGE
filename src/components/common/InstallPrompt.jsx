import { useState } from 'react';
import AppIcon from './AppIcon';
import Button from '../ui/Button';
import { Download, X, ICON_SIZES } from '../../constants/icons';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

const DISMISS_KEY = 'trabage_install_prompt_dismissed';

export default function InstallPrompt() {
  const { canInstall, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'true');

  if (!canInstall || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[70] mx-auto max-w-lg sm:bottom-6">
      <div className="flex items-start gap-3 rounded-2xl border border-primary-100 bg-white p-4 shadow-lg">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
          <AppIcon icon={Download} size={ICON_SIZES.default} className="text-primary-600" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Instalar TrabaGE</p>
          <p className="mt-1 text-xs text-gray-500">
            Añade la app a tu pantalla de inicio para acceder más rápido.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" className="rounded-xl px-4 py-2 text-sm" onClick={install}>
              Instalar
            </Button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Ahora no
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Cerrar"
        >
          <AppIcon icon={X} size={ICON_SIZES.sm} />
        </button>
      </div>
    </div>
  );
}
