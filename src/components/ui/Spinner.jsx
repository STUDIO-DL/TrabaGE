const sizes = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
};

export default function Spinner({ size = 'md', color = 'primary', fullscreen = false }) {
  const colorClass = color === 'white' ? 'border-white border-t-transparent' : 'border-primary-600 border-t-transparent';

  const spinner = (
    <div
      className={`animate-spin rounded-full ${sizes[size]} ${colorClass}`}
      role="status"
      aria-label="Cargando"
    />
  );

  if (fullscreen) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">{spinner}</div>
    );
  }

  return spinner;
}
