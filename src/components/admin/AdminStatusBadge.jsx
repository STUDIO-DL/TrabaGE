const STYLES = {
  active: 'text-success-700 dark:text-success-400',
  inactive: 'text-app-muted',
  pending: 'text-warning-700 dark:text-warning-400',
  approved: 'text-success-700 dark:text-success-400',
  rejected: 'text-error-700 dark:text-error-400',
  hidden: 'text-app-muted',
  reviewed: 'text-app-muted',
  resolved: 'text-success-700 dark:text-success-400',
  dismissed: 'text-app-muted',
  verified: 'text-success-700 dark:text-success-400',
  unverified: 'text-app-muted',
};

export default function AdminStatusBadge({ status, label }) {
  const key = status?.toLowerCase?.() ?? 'inactive';
  const text = label ?? status;

  return (
    <span
      className={[
        'inline-flex rounded-radius-sm bg-app-surface px-space-sm py-0.5 text-caption font-medium capitalize',
        STYLES[key] ?? STYLES.inactive,
      ].join(' ')}
    >
      {text}
    </span>
  );
}
