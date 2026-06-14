import Button from '../ui/Button';

export default function EmptyState({
  image,
  title,
  description,
  actionLabel,
  onAction,
  imageAlt,
}) {
  const alt = imageAlt ?? title;

  return (
    <div
      className="mx-auto flex w-full max-w-[400px] flex-col items-center bg-white px-6 py-10 text-center sm:py-12"
      role="status"
    >
      {image && (
        <img
          src={image}
          alt={alt}
          className="mb-6 w-full max-w-[260px] object-contain"
          loading="lazy"
          decoding="async"
        />
      )}

      <h2 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">{title}</h2>

      {description && (
        <p className="mt-3 text-sm leading-relaxed text-gray-500 sm:text-[15px]">{description}</p>
      )}

      {actionLabel && onAction && (
        <Button type="button" className="mt-8 min-w-[160px]" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
