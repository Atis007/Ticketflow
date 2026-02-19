import { AdminButton } from "../AdminButton";

export function DataGridPagination({ pageIndex, pageSize, total, totalPages, onPageChange, onPageSizeChange }) {
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-border)] px-4 py-4 lg:px-6">
      <div className="text-[var(--admin-text-small)] text-[var(--admin-text-muted)]">
        Showing {from} to {to} of {total}
      </div>

      <div className="flex w-full flex-wrap items-center justify-between gap-3 lg:w-auto lg:justify-end">
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="admin-focus-ring rounded-[var(--admin-radius-md)] border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-2.5 py-1.5 text-[var(--admin-text-caption)] text-[var(--admin-text-primary)]"
        >
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>

        <AdminButton variant="ghost" size="sm" disabled={pageIndex <= 0} onClick={() => onPageChange(pageIndex - 1)}>
          Prev
        </AdminButton>
        <span className="text-[var(--admin-text-small)] text-[var(--admin-text-secondary)]">
          {totalPages === 0 ? 0 : pageIndex + 1} / {totalPages}
        </span>
        <AdminButton variant="ghost" size="sm" disabled={pageIndex + 1 >= totalPages} onClick={() => onPageChange(pageIndex + 1)}>
          Next
        </AdminButton>
      </div>
    </div>
  );
}
