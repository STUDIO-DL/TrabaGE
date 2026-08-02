const variants = {
  verified: 'bg-success-50 text-success-700 ring-1 ring-success-100',
  pending: 'bg-warning-50 text-warning-800 ring-1 ring-warning-100',
  warning: 'bg-warning-50 text-warning-800 ring-1 ring-warning-100',
  success: 'bg-success-50 text-success-700 ring-1 ring-success-100',
  error: 'bg-error-50 text-error-700 ring-1 ring-error-100',
  info: 'bg-app-surface text-app-muted ring-1 ring-app-border',
  default: 'bg-app-surface text-app-muted ring-1 ring-app-border',
  primary: 'bg-primary-50 text-primary-700 ring-1 ring-primary-100',
};

export default function Badge({ variant = 'default', label, children, className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-radius-circular px-space-sm py-0.5 text-caption font-medium',
        variants[variant] || variants.default,
        className,
      ].join(' ')}
    >
      {label ?? children}
    </span>
  );
}
