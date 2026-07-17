import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { KEYBOARD_GAP } from '../../hooks/useKeyboardInsets';
import { measureBottomChromeHeight } from '../../utils/scrollInputIntoView';

const DEFAULT_LIST_MAX_HEIGHT = 224;
const MIN_LIST_MAX_HEIGHT = 120;

export default function AutocompleteInput({
  value,
  onChange,
  onSelect,
  suggestions = [],
  placeholder,
  disabled = false,
  className = '',
  inputClassName = '',
  listClassName = '',
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [listMaxHeight, setListMaxHeight] = useState(DEFAULT_LIST_MAX_HEIGHT);

  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions, value]);

  const updateListMaxHeight = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    const viewport = window.visualViewport;
    if (!viewport) {
      setListMaxHeight(DEFAULT_LIST_MAX_HEIGHT);
      return;
    }

    const rect = root.getBoundingClientRect();
    const bottomChrome = measureBottomChromeHeight();
    const spaceBelow =
      viewport.height - (rect.bottom - viewport.offsetTop) - bottomChrome - KEYBOARD_GAP;
    setListMaxHeight(Math.max(MIN_LIST_MAX_HEIGHT, Math.min(DEFAULT_LIST_MAX_HEIGHT, spaceBelow)));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showList = open && suggestions.length > 0;

  useEffect(() => {
    if (!showList) return undefined;

    updateListMaxHeight();
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', updateListMaxHeight);
    viewport?.addEventListener('scroll', updateListMaxHeight);
    window.addEventListener('resize', updateListMaxHeight);

    return () => {
      viewport?.removeEventListener('resize', updateListMaxHeight);
      viewport?.removeEventListener('scroll', updateListMaxHeight);
      window.removeEventListener('resize', updateListMaxHeight);
    };
  }, [showList, updateListMaxHeight]);

  const pick = (item) => {
    onSelect?.(item);
    onChange?.('');
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (!open || !suggestions.length) {
      if (event.key === 'ArrowDown' && suggestions.length) {
        setOpen(true);
        setActiveIndex(0);
        event.preventDefault();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      pick(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={rootRef} className={`relative w-full min-w-0 ${className}`}>
      <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          onChange?.(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={[
          'w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition-colors',
          'focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
          'border-gray-200',
          inputClassName,
        ].join(' ')}
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className={[
            'absolute z-20 mt-1 w-full overflow-auto overscroll-contain rounded-xl border border-gray-200 bg-white py-1 shadow-lg [-webkit-overflow-scrolling:touch]',
            listClassName,
          ].join(' ')}
          style={{ maxHeight: listMaxHeight }}
        >
          {suggestions.map((item, index) => (
            <li key={item} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(item)}
                className={[
                  'flex min-h-touch w-full px-4 py-space-sm text-left text-sm text-gray-800 hover:bg-gray-50',
                  index === activeIndex ? 'bg-primary-50 text-primary-800' : '',
                ].join(' ')}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
