const variants = {
  verified: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  success: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
  default: 'bg-gray-100 text-gray-700',
};

export default function Badge({ variant = 'default', label, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant] || variants.default} ${className}`}
    >
      {label}
    </span>
  );
}
