const variants = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 disabled:bg-primary-300 disabled:text-white/80',
  secondary:
    'bg-app-card text-app-text ring-1 ring-inset ring-app-border hover:bg-app-surface active:bg-app-disabled disabled:bg-app-disabled disabled:text-app-text-disabled',
  outlined:
    'bg-transparent text-primary-600 ring-1 ring-inset ring-primary-600 hover:bg-primary-50 active:bg-primary-100 disabled:ring-primary-300 disabled:text-primary-300',
  text: 'bg-transparent text-primary-600 hover:bg-primary-50 active:bg-primary-100 disabled:text-app-text-disabled',
  ghost: 'bg-transparent text-primary-600 hover:bg-primary-50 active:bg-primary-100 disabled:text-app-text-disabled',
  danger:
    'bg-error-600 text-white hover:bg-error-700 active:bg-error-800 disabled:bg-error-300',
};

const sizes = {
  sm: 'h-btn-sm min-h-touch sm:min-h-0 px-space-md text-caption rounded-radius-md',
  md: 'h-btn-md min-h-touch px-space-base text-button rounded-radius-md',
  lg: 'h-btn-lg min-h-touch px-space-xl text-button rounded-radius-lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  className = '',
  ...props
}) {
  const resolvedVariant = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-space-sm font-semibold transition-colors duration-fast ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed',
        resolvedVariant,
        sizes[size] || sizes.md,
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading && (
        <span
          className="h-icon-sm w-icon-sm animate-spin rounded-radius-circular border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}
