const sizes = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
};

export default function Spinner({ size = 'md', color = 'primary', fullscreen = false, className = '' }) {
  const colorClass =
    color === 'white'
      ? 'border-white border-t-transparent'
      : 'border-primary-600 border-t-transparent';

  const spinner = (
    <div
      className={`animate-spin rounded-radius-circular ${sizes[size] || sizes.md} ${colorClass} ${className}`}
      role="status"
      aria-label="Cargando"
    />
  );

  if (fullscreen) {
    return (
      <div className="flex min-h-[40dvh] w-full items-center justify-center py-space-xl" aria-busy="true">
        {spinner}
      </div>
    );
  }

  return spinner;
}
