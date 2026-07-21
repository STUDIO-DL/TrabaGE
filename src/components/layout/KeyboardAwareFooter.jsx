import { useKeyboard } from '../../hooks/useKeyboard';

/**
 * Sticky footer wrapper — lifts CTAs above the virtual keyboard with safe-area + gap.
 * When `fixed`, pins to the viewport bottom (chat compose pattern).
 */
export default function KeyboardAwareFooter({
  children,
  className = '',
  style,
  as: Component = 'footer',
  fixed = false,
  ...rest
}) {
  const { footerPaddingBottom, bottomBarInset, isKeyboardVisible } = useKeyboard();

  if (fixed) {
    return (
      <Component
        data-keyboard-footer=""
        className={[
          'keyboard-aware-footer fixed inset-x-0 z-20 mx-auto max-w-lg bg-app-card',
          isKeyboardVisible ? '' : 'pb-safe',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ bottom: bottomBarInset, ...style }}
        {...rest}
      >
        {children}
      </Component>
    );
  }

  return (
    <Component
      data-keyboard-footer=""
      className={['keyboard-aware-footer shrink-0', className].filter(Boolean).join(' ')}
      style={{ paddingBottom: footerPaddingBottom, ...style }}
      {...rest}
    >
      {children}
    </Component>
  );
}
