export default function Input({
  label,
  error,
  icon: Icon,
  className = '',
  id,
  ...props
}) {
  const inputId = id || props.name;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        )}
        <input
          id={inputId}
          className={[
            'w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition-colors',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
            Icon ? 'pl-10' : '',
            error ? 'border-red-500' : 'border-gray-200',
          ].join(' ')}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
