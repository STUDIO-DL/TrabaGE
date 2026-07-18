import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import AppIcon from '../common/AppIcon';
import { ChevronDown, ChevronUp, ChevronsUpDown, ICON_SIZES } from '../../constants/icons';

function SortIndicator({ active, direction }) {
  if (!active) {
    return <AppIcon icon={ChevronsUpDown} size={ICON_SIZES.sm} className="text-gray-300" />;
  }
  return (
    <AppIcon
      icon={direction === 'asc' ? ChevronUp : ChevronDown}
      size={ICON_SIZES.sm}
      className="text-primary-600"
    />
  );
}

export default function AdminTable({
  columns,
  rows,
  loading,
  emptyMessage = 'No hay datos.',
  sortKey,
  sortDir,
  onSort,
  page,
  totalPages,
  totalRows,
  pageSize,
  onPageChange,
}) {
  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
        {emptyMessage}
      </div>
    );
  }

  const showPagination = totalPages > 1 || totalRows > pageSize;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalRows);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => {
                const sortable = column.sortable && column.sortKey && onSort;
                const active = sortable && sortKey === column.sortKey;

                return (
                  <th
                    key={column.key}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => onSort(column.sortKey)}
                        className="inline-flex items-center gap-1 hover:text-gray-700"
                      >
                        {column.label}
                        <SortIndicator active={active} direction={sortDir} />
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50/80">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={[
                      'px-4 py-3 text-sm text-gray-700',
                      column.wrap ? '' : 'whitespace-nowrap',
                    ].join(' ')}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Mostrando {from}–{to} de {totalRows}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Anterior
            </Button>
            <span className="text-xs text-gray-500">
              Página {page} de {totalPages}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
