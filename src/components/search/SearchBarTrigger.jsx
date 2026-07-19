import { useNavigate } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { Search, ICON_COLORS, ICON_SIZES } from '../../constants/icons';

export default function SearchBarTrigger({
  placeholder = 'Buscar usuarios y empresas…',
  className = '',
  inputClassName = '',
  variant = 'pill',
}) {
  const navigate = useNavigate();

  const inputClasses =
    variant === 'rounded'
      ? 'w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-left text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-100'
      : 'w-full rounded-full border-0 bg-gray-100 py-2 pl-9 pr-4 text-left text-sm text-gray-500 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-primary-100';

  return (
    <button
      type="button"
      onClick={() => navigate('/search')}
      className={`relative min-w-0 flex-1 ${className}`}
      aria-label={placeholder}
    >
      <AppIcon
        icon={Search}
        size={ICON_SIZES.default}
        className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${ICON_COLORS.inactive}`}
      />
      <span className={[inputClasses, inputClassName].join(' ')}>{placeholder}</span>
    </button>
  );
}
