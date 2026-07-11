import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppIcon from '../common/AppIcon';
import { Search, ICON_COLORS, ICON_SIZES } from '../../constants/icons';
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import GlobalSearchResults from './GlobalSearchResults';

export default function GlobalSearch({
  placeholder = 'Buscar personas, Business y organizaciones…',
  className = '',
  inputClassName = '',
  variant = 'pill',
  limitPerType = 5,
  showResults = true,
}) {
  const navigate = useNavigate();
  const listId = useId();
  const rootRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { results, loading } = useGlobalSearch(query, {
    enabled: showResults && open,
    limitPerType,
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSelect = () => {
    setQuery('');
    setOpen(false);
  };

  const inputClasses = variant === 'rounded'
    ? 'w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-100'
    : 'w-full rounded-full border-0 bg-gray-100 py-2 pl-9 pr-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-primary-100';

  return (
    <div ref={rootRef} className={`relative min-w-0 flex-1 ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <AppIcon
          icon={Search}
          size={ICON_SIZES.default}
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${ICON_COLORS.inactive}`}
        />
        <input
          type="search"
          role="combobox"
          aria-expanded={open && Boolean(query.trim())}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={[inputClasses, inputClassName].join(' ')}
        />
      </form>

      {showResults && open && query.trim() ? (
        <GlobalSearchResults
          listId={listId}
          query={query}
          results={results}
          loading={loading}
          onSelect={handleSelect}
        />
      ) : null}
    </div>
  );
}
