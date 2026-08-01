import Button from './Button';
import Input from './Input';
import AppIcon from '../common/AppIcon';
import { Plus, Trash2, ICON_SIZES } from '../../constants/icons';

export default function DynamicListInput({
  label,
  items = [],
  onChange,
  placeholder = 'Añadir elemento',
  addLabel = 'Añadir',
}) {
  const updateItem = (index, value) => {
    const next = [...items];
    next[index] = value;
    onChange?.(next);
  };

  const removeItem = (index) => {
    onChange?.(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange?.([...items, '']);
  };

  return (
    <div className="w-full">
      {label && (
        <p className="mb-1.5 block text-sm font-medium text-app-text">{label}</p>
      )}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <Input
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={placeholder}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-app-border text-app-subtle transition-colors hover:border-error-200 hover:bg-error-50 hover:text-error-500"
              aria-label="Eliminar"
            >
              <AppIcon icon={Trash2} size={ICON_SIZES.default} />
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-2 inline-flex items-center gap-1.5"
        onClick={addItem}
      >
        <AppIcon icon={Plus} size={ICON_SIZES.sm} />
        {addLabel}
      </Button>
    </div>
  );
}
