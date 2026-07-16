/**
 * Chip / Tag — compact selectable or static labels.
 * Use `selected` for filter chips; `onRemove` for dismissible tags.
 */
const variants = {
  default: 'bg-app-disabled text-app-muted',
  primary: 'bg-primary-50 text-primary-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  error: 'bg-error-50 text-error-700',
  outline: 'bg-transparent text-app-muted ring-1 ring-inset ring-app-border',
};

export default function Chip({
  children,
  label,
  variant = 'default',
  selected = false,
  onClick,
  onRemove,
  className = '',
  as: Component = onClick ? 'button' : 'span',
  ...props
}) {
  const content = label ?? children;
  const isInteractive = Boolean(onClick);

  return (
    <Component
      type={isInteractive && Component === 'button' ? 'button' : undefined}
      onClick={onClick}
      className={[
        'inline-flex max-w-full items-center gap-space-xs rounded-radius-circular px-space-sm py-0.5 text-caption font-medium',
        'transition-colors duration-fast ease-out',
        selected
          ? 'bg-primary-600 text-white ring-0'
          : variants[variant] || variants.default,
        isInteractive && !selected ? 'hover:bg-app-surface cursor-pointer' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <span className="truncate">{content}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
          className="ml-0.5 rounded-radius-circular p-0.5 opacity-70 hover:opacity-100"
          aria-label="Quitar"
        >
          ×
        </button>
      )}
    </Component>
  );
}

export { Chip as Tag };
