const paddingMap = {
  none: 'p-0',
  sm: 'p-space-sm',
  md: 'p-space-md',
  lg: 'p-space-base',
};

const elevationMap = {
  none: '',
  1: 'shadow-elevation-1',
  2: 'shadow-elevation-2',
  3: 'shadow-elevation-3',
  4: 'shadow-elevation-4',
};

export default function Card({
  children,
  padding = 'md',
  shadow = true,
  elevation = shadow ? 1 : 'none',
  interactive = false,
  className = '',
  as: Component = 'div',
  ...props
}) {
  const elevationClass = elevationMap[elevation] ?? (shadow ? elevationMap[1] : '');

  return (
    <Component
      className={[
        'rounded-radius-lg border border-app-border bg-app-card text-app-text',
        paddingMap[padding] ?? paddingMap.md,
        elevationClass,
        interactive
          ? 'transition-colors duration-fast ease-out hover:border-app-muted/40'
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
