import Button from './Button';

export default function EmptyState({
  image,
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {image && (
        <img src={image} alt="" className="mb-4 h-32 w-32 object-contain opacity-80" />
      )}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>}
      {actionLabel && onAction && (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
