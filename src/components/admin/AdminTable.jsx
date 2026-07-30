import { AdminTableSkeleton } from '../common/Skeleton';
import Button from '../ui/Button';
import AppIcon from '../common/AppIcon';
import { ChevronDown, ChevronUp, ChevronsUpDown, ICON_SIZES } from '../../constants/icons';

function SortIndicator({ active, direction }) {
  if (!active) {
    return <AppIcon icon={ChevronsUpDown} size={ICON_SIZES.sm} className="text-app-subtle" />;
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
    return <AdminTableSkeleton rows={8} columns={Math.max(columns.length, 4)} />;
  }

  if (!rows?.length) {
    return (
      <div className="surface-card p-space-xl text-center text-body-small text-app-muted">
        {emptyMessage}
      </div>
    );
  }

  const showPagination = totalPages > 1 || totalRows > pageSize;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalRows);

  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-app-divider">
          <thead className="bg-app-surface/60">
            <tr>
              {columns.map((column) => {
                const sortable = column.sortable && column.sortKey && onSort;
                const active = sortable && sortKey === column.sortKey;

                return (
                  <th
                    key={column.key}
                    className="whitespace-nowrap px-space-md py-space-sm text-left text-caption font-semibold uppercase tracking-wide text-app-subtle"
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => onSort(column.sortKey)}
                        className="inline-flex items-center gap-space-xs transition-colors hover:text-app-text"
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
          <tbody className="divide-y divide-app-divider">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors duration-fast hover:bg-app-surface/50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={[
                      'px-space-md py-space-sm text-body-small text-app-text',
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

      {showPagination ? (
        <div className="flex flex-col gap-space-sm border-t border-app-divider px-space-md py-space-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-app-muted">
            Mostrando {from}–{to} de {totalRows}
          </p>
          <div className="flex items-center gap-space-sm">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Anterior
            </Button>
            <span className="text-caption text-app-muted">
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
      ) : null}
    </div>
  );
}
