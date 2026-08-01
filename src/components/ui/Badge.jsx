const variants = {
  verified: 'bg-success-100 text-success-800',
  pending: 'bg-warning-100 text-warning-800',
  warning: 'bg-warning-100 text-warning-800',
  success: 'bg-success-100 text-success-800',
  error: 'bg-error-100 text-error-800',
  info: 'bg-primary-50 text-primary-700 ring-1 ring-primary-100',
  default: 'bg-primary-50 text-primary-700 ring-1 ring-primary-100',
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
