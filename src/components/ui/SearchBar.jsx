import AppIcon from '../common/AppIcon';
import { Search, ICON_SIZES } from '../../constants/icons';
import {
  SEARCH_FIELD_ICON,
  SEARCH_FIELD_INPUT,
  SEARCH_FIELD_SHELL,
} from '../search/searchFieldStyles';

/**
 * Search bar — LinkedIn-style pill with inline search icon.
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
      className={[SEARCH_FIELD_SHELL, className].filter(Boolean).join(' ')}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
    >
      <AppIcon icon={Search} size={ICON_SIZES.sm} className={SEARCH_FIELD_ICON} strokeWidth={2} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value, e)}
        placeholder={placeholder}
        className={[SEARCH_FIELD_INPUT, inputClassName].filter(Boolean).join(' ')}
        {...props}
      />
    </form>
  );
}
