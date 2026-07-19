import { useNavigate } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { Search, ICON_SIZES } from '../../constants/icons';
import {
  SEARCH_FIELD_ICON,
  SEARCH_FIELD_PLACEHOLDER,
  SEARCH_FIELD_SHELL,
} from './searchFieldStyles';

export default function SearchBarTrigger({
  placeholder = 'Buscar usuarios y empresas…',
  className = '',
}) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/search')}
      className={[SEARCH_FIELD_SHELL, className].filter(Boolean).join(' ')}
      aria-label={placeholder}
    >
      <AppIcon icon={Search} size={ICON_SIZES.sm} className={SEARCH_FIELD_ICON} strokeWidth={2} />
      <span className={SEARCH_FIELD_PLACEHOLDER}>{placeholder}</span>
    </button>
  );
}
