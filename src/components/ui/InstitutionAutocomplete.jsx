import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import AppIcon from '../common/AppIcon';
import { GraduationCap, ICON_SIZES } from '../../constants/icons';
import { INSTITUTIONS, INSTITUTION_TYPE_LABELS } from '../../data/institutions';
import { searchInstitutions } from '../../utils/searchInstitutions';

const MANUAL_FOOTER_ID = '__manual_entry__';
const DEFAULT_LIST_MAX_HEIGHT = 224;
const MIN_LIST_MAX_HEIGHT = 120;

/**
 * LinkedIn-style institution combobox with local catalog search.
 *
 * QA checklist:
 * - partial / multi-word / case / accent-insensitive search (searchInstitutions)
 * - keyboard: ArrowUp/Down, Enter, Escape, Tab; ARIA combobox + listbox
 * - mobile: visualViewport-aware max-height so list stays above keyboard
 * - saves official full institution name via onChange
 */
export default function InstitutionAutocomplete({
  label,
  value = '',
  onChange,
  error,
  hint,
  required,
  disabled = false,
  className = '',
  id,
  placeholder = 'Buscar institución educativa',
  institutions = INSTITUTIONS,
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listId = `${inputId}-listbox`;
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [manualMode, setManualMode] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [listMaxHeight, setListMaxHeight] = useState(DEFAULT_LIST_MAX_HEIGHT);

  const catalogEmpty = institutions.length === 0;

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [query, manualMode, institutions]);

  const results = useMemo(() => {
    if (manualMode || catalogEmpty) return [];
    return searchInstitutions(query, institutions);
  }, [query, institutions, manualMode, catalogEmpty]);

  const showManualFooter = Boolean(query.trim()) && !manualMode;
  const optionCount = results.length + (showManualFooter ? 1 : 0);
  const showList = open && !manualMode && (results.length > 0 || showManualFooter);

  const updateListMaxHeight = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    const viewport = window.visualViewport;
    if (!viewport) {
      setListMaxHeight(DEFAULT_LIST_MAX_HEIGHT);
      return;
    }

    const rect = root.getBoundingClientRect();
    const spaceBelow = viewport.height - (rect.bottom - viewport.offsetTop) - 16;
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

  const selectInstitution = useCallback(
    (institution) => {
      onChange?.(institution.name);
      setQuery(institution.name);
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
    setOpen(true);
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
      if (event.key === 'ArrowDown' && query.trim()) {
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
        selectInstitution(results[activeIndex]);
      }
    }
  };

  const getActiveOptionId = () => {
    if (activeIndex < 0) return undefined;
    if (showManualFooter && activeIndex === results.length) return `${listId}-manual`;
    const institution = results[activeIndex];
    return institution ? `${listId}-${institution.id}` : undefined;
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
          if (!manualMode) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={[
          'h-input-md min-h-touch w-full rounded-radius-md border bg-app-card px-space-md text-body-small text-app-text outline-none',
          'transition-colors duration-fast ease-out placeholder:text-app-subtle placeholder:opacity-80',
          'focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
          'disabled:cursor-not-allowed disabled:bg-app-disabled disabled:text-app-text-disabled',
          error ? 'border-error-500 focus:ring-error-100' : 'border-app-border',
        ].join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${inputId}-error` : hint ? `${inputId}-hint` : catalogEmpty && import.meta.env.DEV
            ? `${inputId}-catalog-empty`
            : undefined
        }
      />

      {import.meta.env.DEV && catalogEmpty && (
        <p id={`${inputId}-catalog-empty`} className="mt-space-xs text-caption text-amber-700">
          Catálogo de instituciones vacío — importa el documento oficial en{' '}
          <code className="text-xs">src/data/institutions.js</code>.
        </p>
      )}

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
          Modo manual — escribe el nombre oficial completo de tu institución.
        </p>
      )}

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 w-full overflow-auto rounded-radius-md border border-app-border bg-app-card py-1 shadow-sm"
          style={{ maxHeight: listMaxHeight }}
        >
          {results.map((institution, index) => {
            const typeLabel = INSTITUTION_TYPE_LABELS[institution.type] || institution.type;
            const isActive = index === activeIndex;

            return (
              <li
                key={institution.id}
                id={`${listId}-${institution.id}`}
                role="option"
                aria-selected={isActive}
              >
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectInstitution(institution)}
                  className={[
                    'flex w-full items-start gap-3 px-space-md py-2.5 text-left transition-colors',
                    isActive ? 'bg-primary-50' : 'hover:bg-gray-50',
                  ].join(' ')}
                >
                  <AppIcon
                    icon={GraduationCap}
                    size={ICON_SIZES.md}
                    className="mt-0.5 text-primary-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-small font-medium text-app-text">
                      {institution.name}
                    </span>
                    <span className="mt-0.5 block truncate text-caption text-app-subtle">
                      {institution.city} • {institution.country}
                    </span>
                  </span>
                  <span
                    className={[
                      'shrink-0 rounded-full border px-2 py-0.5 text-caption font-medium',
                      isActive
                        ? 'border-primary-200 bg-primary-100 text-primary-800'
                        : 'border-gray-200 bg-gray-50 text-app-muted',
                    ].join(' ')}
                  >
                    {typeLabel}
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
                  'w-full border-t border-gray-100 px-space-md py-2.5 text-left text-caption text-primary-700 transition-colors',
                  activeIndex === results.length ? 'bg-primary-50' : 'hover:bg-gray-50',
                ].join(' ')}
              >
                No encuentras tu institución educativa? Escríbela manualmente.
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
