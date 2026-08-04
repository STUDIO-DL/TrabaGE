import { useId, useRef, useState } from 'react';
import AppIcon from '../common/AppIcon';
import BottomSheet from '../ui/BottomSheet';
import { Camera, Pencil, Trash2, ICON_SIZES } from '../../constants/icons';
import { getUploadPhaseLabel } from '../../constants/uploadPhases';

const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp';

const sheetItemClass =
  'flex w-full min-h-touch items-center gap-space-md rounded-radius-md px-space-sm py-space-sm text-left text-body-small font-medium text-app-text transition-colors duration-fast hover:bg-app-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Discreet avatar edit control: circular camera over the photo + bottom sheet actions.
 * Only render for the profile owner (caller must gate visibility).
 */
export default function AvatarEditControl({
  hasPhoto = false,
  loading = false,
  uploadPhase = null,
  onReplace,
  onRemove,
  className = '',
}) {
  const reactId = useId();
  const inputId = `avatar-edit-input-${reactId}`;
  const inputRef = useRef(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const closeSheet = () => {
    if (loading) return;
    setSheetOpen(false);
  };

  const handleReplace = () => {
    // Keep the OS picker inside the same user-gesture turn.
    inputRef.current?.click();
    setSheetOpen(false);
  };

  const handleRemove = () => {
    setSheetOpen(false);
    onRemove?.();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) onReplace?.(file);
    event.target.value = '';
  };

  const statusLabel = loading
    ? getUploadPhaseLabel(uploadPhase) || 'Subiendo…'
    : 'Editar foto de perfil';

  return (
    <>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={AVATAR_ACCEPT}
        className="sr-only"
        disabled={loading}
        onChange={handleFileChange}
      />

      <button
        type="button"
        disabled={loading}
        onClick={() => setSheetOpen(true)}
        aria-label={statusLabel}
        title={statusLabel}
        className={[
          'absolute bottom-0 right-0 z-20 flex h-9 w-9 items-center justify-center',
          'rounded-radius-circular bg-primary-600 text-white shadow-elevation-1',
          'ring-2 ring-app-card transition-colors duration-fast',
          'hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          'disabled:cursor-not-allowed disabled:opacity-70',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {loading ? (
          <span className="text-xs font-semibold" aria-hidden>
            …
          </span>
        ) : (
          <AppIcon icon={hasPhoto ? Pencil : Camera} size={ICON_SIZES.sm} className="text-white" aria-hidden />
        )}
      </button>

      <BottomSheet isOpen={sheetOpen} onClose={closeSheet} title="Foto de perfil">
        <div className="flex flex-col gap-space-xs" role="menu">
          <button
            type="button"
            role="menuitem"
            disabled={loading}
            onClick={handleReplace}
            className={sheetItemClass}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-radius-circular bg-primary-50 text-primary-600 dark:bg-primary-600/15 dark:text-primary-400">
              <AppIcon icon={Camera} size={ICON_SIZES.md} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block">{hasPhoto ? 'Reemplazar foto' : 'Añadir foto'}</span>
              <span className="mt-0.5 block text-caption font-normal text-app-muted">
                Elige una imagen de la galería o la cámara
              </span>
            </span>
          </button>

          {hasPhoto && onRemove ? (
            <button
              type="button"
              role="menuitem"
              disabled={loading}
              onClick={handleRemove}
              className={`${sheetItemClass} text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-600/10`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-radius-circular bg-error-50 text-error-600 dark:bg-error-600/15 dark:text-error-400">
                <AppIcon icon={Trash2} size={ICON_SIZES.md} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block">Eliminar foto</span>
                <span className="mt-0.5 block text-caption font-normal text-app-muted">
                  Restaura el avatar predeterminado de TrabaGE
                </span>
              </span>
            </button>
          ) : null}
        </div>
      </BottomSheet>
    </>
  );
}
