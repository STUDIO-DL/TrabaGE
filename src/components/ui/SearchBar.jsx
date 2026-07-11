import AppIcon from '../common/AppIcon';
import { Search, ICON_SIZES } from '../../constants/icons';

/**
 * Search bar — tokenized input with leading search icon.
 */
export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Buscar…',
  className = '',
  inputClassName = '',
  ...props
}) {
  return (
    <form
      role="search"
      className={`relative w-full ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
    >
      <AppIcon
        icon={Search}
        size={ICON_SIZES.md}
        className="pointer-events-none absolute left-space-md top-1/2 -translate-y-1/2 text-app-subtle"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value, e)}
        placeholder={placeholder}
        className={[
          'h-input-md w-full rounded-radius-lg border border-app-border bg-app-card pl-10 pr-space-base text-body-small text-app-text',
          'outline-none transition-colors duration-fast ease-out placeholder:text-app-subtle',
          'focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
          inputClassName,
        ].join(' ')}
        {...props}
      />
    </form>
  );
}
