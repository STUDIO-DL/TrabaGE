const STYLES = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  hidden: 'bg-gray-100 text-gray-600',
  reviewed: 'bg-blue-50 text-blue-700',
  resolved: 'bg-emerald-50 text-emerald-700',
  dismissed: 'bg-gray-100 text-gray-600',
  verified: 'bg-emerald-50 text-emerald-700',
  unverified: 'bg-gray-100 text-gray-600',
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
