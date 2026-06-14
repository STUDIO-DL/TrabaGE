export default function Textarea({ label, error, className = '', id, rows = 4, ...props }) {
  const inputId = id || props.name;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={[
          'w-full resize-y rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition-colors',
          'focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
          error ? 'border-red-500' : 'border-gray-200',
        ].join(' ')}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
