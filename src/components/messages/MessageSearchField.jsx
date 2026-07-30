import AppIcon from '../common/AppIcon';
import { Search, X, ICON_SIZES } from '../../constants/icons';

/**
 * Shared search field for inbox / in-thread messaging search.
 */
export default function MessageSearchField({
  value,
  onChange,
  placeholder = 'Buscar',
  autoFocus = false,
  onClear,
  className = '',
  inputRef,
}) {
  return (
    <label className={`relative block ${className}`.trim()}>
      <span className="sr-only">{placeholder}</span>
      <AppIcon
        icon={Search}
        size={ICON_SIZES.sm}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="search"
        className="h-10 w-full rounded-radius-md border border-app-border bg-app-card py-2 pl-9 pr-9 text-body-small text-app-text outline-none placeholder:text-app-subtle focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      />
      {value && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-radius-sm text-app-muted hover:bg-app-surface hover:text-app-text"
          aria-label="Limpiar búsqueda"
        >
          <AppIcon icon={X} size={ICON_SIZES.sm} />
        </button>
      ) : null}
    </label>
  );
}
