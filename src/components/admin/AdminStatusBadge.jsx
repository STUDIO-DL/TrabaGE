const STYLES = {
  active: 'bg-app-surface text-success-700 dark:text-success-400',
  inactive: 'bg-app-surface text-app-muted',
  pending: 'bg-app-surface text-app-muted',
  approved: 'bg-app-surface text-success-700 dark:text-success-400',
  rejected: 'bg-app-surface text-error-700 dark:text-error-400',
  hidden: 'bg-app-surface text-app-muted',
  reviewed: 'bg-app-surface text-app-muted',
  resolved: 'bg-app-surface text-success-700 dark:text-success-400',
  dismissed: 'bg-app-surface text-app-muted',
  verified: 'bg-app-surface text-success-700 dark:text-success-400',
  unverified: 'bg-app-surface text-app-muted',
};

export default function AdminStatusBadge({ status, label }) {
  const key = status?.toLowerCase?.() ?? 'inactive';
  const text = label ?? status;

  return (
    <span
      className={[
        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize',
        STYLES[key] ?? STYLES.inactive,
      ].join(' ')}
    >
      {text}
    </span>
  );
}
