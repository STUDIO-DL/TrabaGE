import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import AppIcon from '../common/AppIcon';
import { X, ICON_SIZES } from '../../constants/icons';
import useAnimatedPresence from '../../hooks/useAnimatedPresence';
import { useKeyboard } from '../../hooks/useKeyboard';

/**
 * Dialog — mobile: bottom sheet feel; sm+: centered modal.
 * Pass `variant="sheet"` to force bottom-sheet presentation.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  variant = 'auto',
  size = 'md',
  /** When true, children include KeyboardAwareFooter — panel skips keyboard bottom padding to avoid double inset. */
  footerAware = false,
}) {
  const { mounted, exiting } = useAnimatedPresence(isOpen, 200);
  const { keyboardHeight, keyboardGap, isKeyboardVisible } = useKeyboard();

  useEffect(() => {
    if (!mounted || exiting) return undefined;

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [mounted, exiting, onClose]);

  if (!mounted) return null;

  const isSheet = variant === 'sheet';
  const maxWidth =
    size === 'sm' ? 'sm:max-w-sm' : size === 'lg' ? 'sm:max-w-xl' : 'sm:max-w-lg';

  const panelMotion = exiting
    ? 'animate-[sheetSlideDown_var(--motion-fast)_var(--ease-out)_forwards]'
    : isSheet
      ? 'animate-[sheetSlideUp_var(--motion-normal)_var(--ease-out)]'
      : 'animate-[cardFadeIn_var(--motion-normal)_var(--ease-out)]';

  const overlayMotion = exiting
    ? 'animate-[overlayFadeOut_var(--motion-fast)_var(--ease-out)_forwards]'
    : 'animate-[overlayFadeIn_var(--motion-fast)_var(--ease-out)]';

  const panelPaddingBottom =
    footerAware && isKeyboardVisible
      ? 'env(safe-area-inset-bottom, 0px)'
      : isKeyboardVisible
        ? `calc(${keyboardHeight}px + ${keyboardGap}px + env(safe-area-inset-bottom, 0px))`
        : 'max(1.5rem, env(safe-area-inset-bottom, 0px))';

  const panelMaxHeight = isKeyboardVisible
    ? `calc(100dvh - ${keyboardHeight}px - ${keyboardGap}px)`
    : 'min(90dvh, 90vh)';

  return createPortal(
    <div
      className={[
        'fixed inset-0 z-modal flex touch-none justify-center',
        isSheet ? 'items-end' : 'items-end sm:items-center',
      ].join(' ')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-app-overlay/55 ${overlayMotion}`}
        aria-label="Cerrar modal"
        onClick={onClose}
      />
      <div
        className={[
          'relative z-10 flex w-full max-w-full flex-col overflow-hidden bg-app-card p-space-base text-app-text shadow-elevation-4 keyboard-aware-footer overscroll-contain',
          footerAware ? 'min-h-0' : 'overflow-y-auto',
          panelMotion,
          isSheet
            ? 'rounded-t-radius-xl'
            : `rounded-t-radius-xl sm:rounded-radius-xl ${maxWidth}`,
        ].join(' ')}
        style={{
          maxHeight: panelMaxHeight,
          paddingBottom: panelPaddingBottom,
          WebkitOverflowScrolling: footerAware ? undefined : 'touch',
        }}
      >
        {isSheet && (
          <div className="mb-space-md flex shrink-0 justify-center" aria-hidden>
            <span className="h-1 w-10 rounded-radius-circular bg-app-border" />
          </div>
        )}
        <div className="mb-space-base flex shrink-0 items-start justify-between gap-space-md">
          {title && (
            <h2 id="modal-title" className="min-w-0 flex-1 text-title text-app-text">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto min-h-touch min-w-touch shrink-0 rounded-radius-sm p-space-sm text-app-muted transition-colors duration-fast hover:bg-app-surface"
            aria-label="Cerrar"
          >
            <AppIcon icon={X} size={ICON_SIZES.md} />
          </button>
        </div>
        {footerAware ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        ) : (
          children
        )}
      </div>
    </div>,
    document.body,
  );
}
