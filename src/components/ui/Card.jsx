const paddingMap = {
  none: 'p-0',
  sm: 'p-space-sm',
  md: 'p-space-md',
  lg: 'p-space-base',
};

/**
 * Product surface. Default: border-only card (no stacked shadow).
 * elevation prop kept for API compat but ignored for levels ≤1 — overlays use Modal.
 */
export default function Card({
  children,
  padding = 'md',
  shadow = false,
  elevation = 'none',
  interactive = false,
  className = '',
  as: Component = 'div',
  ...props
}) {
  return (
    <Component
      className={[
        'surface-card',
        paddingMap[padding] ?? paddingMap.md,
        interactive
          ? 'surface-press hover:border-primary-200 hover:bg-primary-50/50'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Component>
  );
}
