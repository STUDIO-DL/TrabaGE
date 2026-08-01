const STYLES = {
  active: 'bg-primary-50 text-primary-700 ring-1 ring-primary-100',
  inactive: 'bg-primary-50/70 text-primary-600/80 ring-1 ring-primary-100/80',
  pending: 'bg-warning-50 text-warning-700 ring-1 ring-warning-100',
  approved: 'bg-success-50 text-success-700 ring-1 ring-success-100',
  rejected: 'bg-error-50 text-error-700 ring-1 ring-error-100',
  hidden: 'bg-primary-50/70 text-primary-600/80 ring-1 ring-primary-100/80',
  reviewed: 'bg-primary-50/70 text-primary-600/80 ring-1 ring-primary-100/80',
  resolved: 'bg-success-50 text-success-700 ring-1 ring-success-100',
  dismissed: 'bg-primary-50/70 text-primary-600/80 ring-1 ring-primary-100/80',
  verified: 'bg-success-50 text-success-700 ring-1 ring-success-100',
  unverified: 'bg-primary-50/70 text-primary-600/80 ring-1 ring-primary-100/80',
};

export default function AdminStatusBadge({ status, label }) {
  const key = status?.toLowerCase?.() ?? 'inactive';
  const text = label ?? status;

  return (
    <span
      className={[
        'inline-flex rounded-radius-circular px-space-sm py-0.5 text-caption font-medium capitalize',
        STYLES[key] ?? STYLES.inactive,
      ].join(' ')}
    >
      {text}
    </span>
  );
}
