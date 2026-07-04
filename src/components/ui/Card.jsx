export default function Card({ children, padding = 'md', shadow = true, className = '' }) {
  const paddingClass = padding === 'sm' ? 'p-3' : padding === 'lg' ? 'p-6' : 'p-4';

  return (
    <div
      className={[
        'rounded-2xl border border-app-border bg-app-card text-app-text',
        paddingClass,
        shadow ? 'shadow-sm' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
