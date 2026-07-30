import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import AppIcon from '../common/AppIcon';
import { Building2, GraduationCap, ICON_SIZES } from '../../constants/icons';
import {
  formatCatalogDisplayName,
  getExperienceOrganizations,
  searchOrganizations,
} from '../../utils/searchOrganizations';
import { KEYBOARD_GAP } from '../../hooks/useKeyboardInsets';
import { measureBottomChromeHeight } from '../../utils/scrollInputIntoView';

const MANUAL_FOOTER_ID = '__manual_entry__';
const DEFAULT_LIST_MAX_HEIGHT = 224;
const MIN_LIST_MAX_HEIGHT = 120;
const MIN_SEARCH_CHARS = 1;
const EMPTY_MATCH_MESSAGE = 'No encontramos ninguna coincidencia';

/**
 * Autocomplete for employers / organizations (experience section).
 * Empty until the user types; local catalog search only.
 */
export default function OrganizationAutocomplete({
  label,
  value = '',
  onChange,
  error,
  hint,
  required,
  disabled = false,
  className = '',
  id,
  placeholder = 'Escribe el nombre de la empresa u organización',
  organizations = null,
  emptyMatchMessage = EMPTY_MATCH_MESSAGE,
  manualEntryLabel = 'No encuentras la organización? Escríbela manualmente.',
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listId = `${inputId}-listbox`;
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const catalog = useMemo(
    () => organizations || getExperienceOrganizations(),
    [organizations],
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [manualMode, setManualMode] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [listMaxHeight, setListMaxHeight] = useState(DEFAULT_LIST_MAX_HEIGHT);

  const catalogEmpty = catalog.length === 0;
  const trimmedQuery = query.trim();
  const hasMinQuery = trimmedQuery.length >= MIN_SEARCH_CHARS;

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [query, manualMode, catalog]);

  const results = useMemo(() => {
    if (manualMode || catalogEmpty || !hasMinQuery) return [];
    return searchOrganizations(query, catalog, { limit: 8 });
  }, [query, catalog, manualMode, catalogEmpty, hasMinQuery]);

  const showManualFooter = hasMinQuery && !manualMode;
  const showEmptyMatch = hasMinQuery && !manualMode && results.length === 0 && !catalogEmpty;
  const optionCount = results.length + (showManualFooter ? 1 : 0);
  const showList =
    open && !manualMode && hasMinQuery && (results.length > 0 || showManualFooter || showEmptyMatch);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectOrganization = useCallback(
    (organization) => {
      onChange?.(organization.name);
      setQuery(organization.name);
      setManualMode(false);
      setOpen(false);
      setActiveIndex(-1);
    },
    [onChange],
  );

  const enableManualEntry = useCallback(() => {
    setManualMode(true);
    setOpen(false);
    setActiveIndex(-1);
    onChange?.(query);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [onChange, query]);

  const handleInputChange = (event) => {
    const next = event.target.value;
    setQuery(next);
    setManualMode(false);
    const nextTrimmed = next.trim();
    setOpen(nextTrimmed.length >= MIN_SEARCH_CHARS);
    onChange?.(next);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Tab') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (manualMode) return;

    if (!showList || optionCount === 0) {
      if (event.key === 'ArrowDown' && hasMinQuery) {
        setOpen(true);
        setActiveIndex(0);
        event.preventDefault();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % optionCount);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? optionCount - 1 : index - 1));
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      if (showManualFooter && activeIndex === results.length) {
        enableManualEntry();
        return;
      }
      if (results[activeIndex]) {
        selectOrganization(results[activeIndex]);
      }
    }
  };

  const getActiveOptionId = () => {
    if (activeIndex < 0) return undefined;
    if (showManualFooter && activeIndex === results.length) return `${listId}-manual`;
    const organization = results[activeIndex];
    return organization ? `${listId}-${organization.id}` : undefined;
  };

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="mb-space-sm block text-label text-app-muted">
          {label}
          {required ? <span className="text-red-600" aria-hidden="true"> *</span> : null}
        </label>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={getActiveOptionId()}
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        onChange={handleInputChange}
        onFocus={() => {
          if (!manualMode && hasMinQuery) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={[
          'h-input-md min-h-touch w-full rounded-radius-md border bg-app-card px-space-md text-base text-app-text outline-none',
          'transition-colors duration-fast ease-out placeholder:text-app-subtle placeholder:opacity-80',
          'focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
          'disabled:cursor-not-allowed disabled:bg-app-disabled disabled:text-app-text-disabled',
          error ? 'border-error-500 focus:ring-error-100' : 'border-app-border',
        ].join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
      />

      {error && (
        <p id={`${inputId}-error`} className="mt-space-xs text-caption text-error-600">
          {error}
        </p>
      )}

      {!error && hint && (
        <p id={`${inputId}-hint`} className="mt-space-xs text-caption text-app-subtle">
          {hint}
        </p>
      )}

      {manualMode && (
        <p className="mt-space-xs text-caption text-app-subtle">
          Modo manual — escribe el nombre oficial completo.
        </p>
      )}

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 w-full overflow-auto overscroll-contain rounded-radius-md border border-app-border bg-app-card py-1 shadow-sm [-webkit-overflow-scrolling:touch]"
          style={{ maxHeight: listMaxHeight }}
        >
          {showEmptyMatch && (
            <li className="px-space-md py-space-sm text-caption text-app-muted" role="presentation">
              {emptyMatchMessage}
            </li>
          )}

          {results.map((organization, index) => {
            const isActive = index === activeIndex;
            const isEducation = organization.organizationType === 'education';
            const Icon = isEducation ? GraduationCap : Building2;

            return (
              <li
                key={`${organization.organizationType}-${organization.id}`}
                id={`${listId}-${organization.id}`}
                role="option"
                aria-selected={isActive}
              >
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOrganization(organization)}
                  className={[
                    'flex min-h-touch w-full items-start gap-space-sm px-space-md py-space-sm text-left transition-colors',
                    isActive ? 'bg-primary-50' : 'hover:bg-gray-50',
                  ].join(' ')}
                >
                  <AppIcon
                    icon={Icon}
                    size={ICON_SIZES.md}
                    className="mt-0.5 shrink-0 text-primary-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-small font-medium text-app-text">
                      {formatCatalogDisplayName(organization)}
                    </span>
                    {organization.subtitle ? (
                      <span className="mt-0.5 block truncate text-caption text-app-subtle">
                        {organization.subtitle}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}

          {showManualFooter && (
            <li
              id={`${listId}-manual`}
              role="option"
              aria-selected={activeIndex === results.length}
              data-option-id={MANUAL_FOOTER_ID}
            >
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={enableManualEntry}
                className={[
                  'min-h-touch w-full border-t border-gray-100 px-space-md py-space-sm text-left text-caption text-primary-700 transition-colors',
                  activeIndex === results.length ? 'bg-primary-50' : 'hover:bg-gray-50',
                ].join(' ')}
              >
                {manualEntryLabel}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
