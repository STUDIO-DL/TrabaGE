import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import AppIcon from '../common/AppIcon';
import { X, ICON_SIZES } from '../../constants/icons';
import useAnimatedPresence from '../../hooks/useAnimatedPresence';

/**
 * Bottom sheet — mobile-first overlay anchored to the bottom edge.
 */
export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) {
  const { mounted, exiting } = useAnimatedPresence(isOpen, 200);

  useEffect(() => {
    if (!mounted || exiting) return undefined;

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [mounted, exiting, onClose]);

  if (!mounted) return null;

  const panelMotion = exiting
    ? 'animate-[sheetSlideDown_var(--motion-fast)_var(--ease-out)_forwards]'
    : 'animate-[sheetSlideUp_var(--motion-normal)_var(--ease-out)]';

  const overlayMotion = exiting
    ? 'animate-[overlayFadeOut_var(--motion-fast)_var(--ease-out)_forwards]'
    : 'animate-[overlayFadeIn_var(--motion-fast)_var(--ease-out)]';

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        type="button"
        className={`absolute inset-0 bg-app-overlay/55 ${overlayMotion}`}
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        className={[
          'relative z-10 w-full max-w-lg rounded-t-radius-xl bg-app-card p-space-xl text-app-text shadow-elevation-4',
          'max-h-[85dvh] overflow-y-auto',
          panelMotion,
          className,
        ].join(' ')}
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mb-space-md flex justify-center" aria-hidden>
          <span className="h-1 w-10 rounded-radius-circular bg-app-border" />
        </div>
        {(title || onClose) && (
          <div className="mb-space-base flex items-center justify-between gap-space-md">
            {title ? <h2 className="text-title text-app-text">{title}</h2> : <span />}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="min-h-touch min-w-touch rounded-radius-sm p-space-sm text-app-muted transition-colors duration-fast hover:bg-app-surface"
                aria-label="Cerrar"
              >
                <AppIcon icon={X} size={ICON_SIZES.md} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
