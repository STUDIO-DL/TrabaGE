import { useKeyboard } from '../../hooks/useKeyboard';

/**
 * Sticky footer wrapper — lifts CTAs above the virtual keyboard with safe-area + gap.
 */
export default function KeyboardAwareFooter({
  children,
  className = '',
  style,
  as: Component = 'footer',
  ...rest
}) {
  const { footerPaddingBottom } = useKeyboard();

  return (
    <Component
      className={['keyboard-aware-footer shrink-0', className].filter(Boolean).join(' ')}
      style={{ paddingBottom: footerPaddingBottom, ...style }}
      {...rest}
    >
      {children}
    </Component>
  );
}
