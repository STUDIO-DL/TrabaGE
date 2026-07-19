import { RefreshCw } from 'lucide-react';

import AppIcon from './AppIcon';
import Button from '../ui/Button';
import { X, ICON_SIZES } from '../../constants/icons';
import { usePwaUpdate } from '../../hooks/usePwaUpdate';

export default function PwaUpdatePrompt() {
  const { needRefresh, isUpdating, applyUpdate, dismissUpdate } = usePwaUpdate();

  if (!needRefresh) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-4 z-[80] flex justify-center px-4"
      role="region"
      aria-label="Actualización disponible"
    >
      <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-app-border bg-app-card/95 p-4 shadow-elevation-2 backdrop-blur-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <AppIcon icon={RefreshCw} size={ICON_SIZES.sm} strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-app-text">Hay una nueva versión disponible</p>
          <p className="mt-1 text-[12px] leading-relaxed text-app-subtle">
            Puedes actualizar ahora o seguir usando la app. Tus datos no se perderán.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="!rounded-lg !px-3 !py-1.5 text-caption"
              onClick={applyUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? 'Actualizando…' : 'Actualizar ahora'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="!rounded-lg !px-3 !py-1.5 text-caption"
              onClick={dismissUpdate}
              disabled={isUpdating}
            >
              Más tarde
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismissUpdate}
          className="rounded-lg p-1 text-app-subtle transition-colors hover:bg-app-surface hover:text-app-muted"
          aria-label="Cerrar"
          disabled={isUpdating}
        >
          <AppIcon icon={X} size={ICON_SIZES.sm} />
        </button>
      </div>
    </div>
  );
}
