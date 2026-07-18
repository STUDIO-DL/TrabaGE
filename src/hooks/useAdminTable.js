import { useMemo, useState } from 'react';

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  if (typeof a === 'boolean') {
    return Number(a) - Number(b);
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  const aDate = Date.parse(a);
  const bDate = Date.parse(b);
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
    return aDate - bDate;
  }

  return String(a).localeCompare(String(b), 'es', { sensitivity: 'base' });
}

function getNestedValue(row, key) {
  if (!key?.includes('.')) return row[key];
  return key.split('.').reduce((acc, part) => acc?.[part], row);
}

/**
 * Client-side search, filter, sort, and pagination for admin tables.
 */
export default function useAdminTable(rows, options = {}) {
  const {
    searchQuery = '',
    searchKeys = [],
    filters = {},
    defaultSortKey = 'created_at',
    defaultSortDir = 'desc',
    pageSize = 10,
  } = options;

  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState(defaultSortDir);

  const filteredRows = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    return (rows ?? []).filter((row) => {
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (value == null || value === '' || value === 'all') return true;
        return getNestedValue(row, key) === value;
      });

      if (!matchesFilters) return false;

      if (!normalized) return true;

      return searchKeys.some((key) => {
        const value = getNestedValue(row, key);
        return value != null && String(value).toLowerCase().includes(normalized);
      });
    });
  }, [filters, rows, searchKeys, searchQuery]);

  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];
    copy.sort((left, right) => {
      const result = compareValues(getNestedValue(left, sortKey), getNestedValue(right, sortKey));
      return sortDir === 'asc' ? result : -result;
    });
    return copy;
  }, [filteredRows, sortDir, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [pageSize, safePage, sortedRows]);

  const toggleSort = (key) => {
    setPage(1);
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

  const resetPage = () => setPage(1);

  return {
    rows: paginatedRows,
    totalRows: sortedRows.length,
    page: safePage,
    setPage,
    totalPages,
    pageSize,
    sortKey,
    sortDir,
    toggleSort,
    resetPage,
  };
}
