import { useEffect, useRef, useState } from "react";

export function AdminTable({
  columns,
  data,
  loading = false,
  isRefreshing = false,
  emptyMessage = "No data available",
  onRowClick,
  selectedRows,
  onSelectRow,
  onSelectAllRows,
  rowKey = "id",
  compact = false,
}) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }

    setSortColumn(columnKey);
    setSortDirection("asc");
  };

  const rowHeight = compact ? "var(--admin-table-row-height-compact)" : "var(--admin-table-row-height)";
  const headerCheckboxRef = useRef(null);
  const selectedCount = selectedRows?.size ?? 0;
  const selectableCount = data.length;
  const allSelected = selectableCount > 0 && selectedCount === selectableCount;
  const someSelected = selectedCount > 0 && selectedCount < selectableCount;
  const isInitialLoading = loading && data.length === 0;
  const showRefreshingIndicator = !isInitialLoading && (loading || isRefreshing);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  return (
    <div className="relative admin-scrollbar w-full overflow-x-auto rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)]">
      {showRefreshingIndicator ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 bg-[var(--admin-interactive-primary)] opacity-80" />
      ) : null}

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-table-header)]">
            {onSelectRow ? (
              <th className="w-12 px-4 py-3 text-left">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onSelectAllRows?.()}
                  className="h-4 w-4 cursor-pointer rounded border-[var(--admin-border)] bg-[var(--admin-surface-input)]"
                />
              </th>
            ) : null}
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-[var(--admin-text-caption)] font-semibold tracking-wider text-[var(--admin-text-secondary)] uppercase ${column.align === "center" ? "text-center" : column.align === "right" ? "text-right" : "text-left"} ${column.sortable ? "cursor-pointer select-none transition-colors hover:text-[var(--admin-text-primary)]" : ""}`}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  <span>{column.label}</span>
                  {column.sortable ? (
                    <span className="material-symbols-outlined text-base">
                      {sortColumn === column.key ? (sortDirection === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more"}
                    </span>
                  ) : null}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isInitialLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={`loading-${i}`} className="border-b border-[var(--admin-border)]">
                  {onSelectRow ? (
                    <td className="px-4 py-3">
                      <div className="admin-skeleton h-4 w-4 rounded" />
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td key={`${column.key}-${i}`} className="px-4 py-3">
                      <div className="admin-skeleton h-4 w-3/4 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            : null}

          {!isInitialLoading && data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (onSelectRow ? 1 : 0)} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-5xl text-[var(--admin-text-disabled)]">inbox</span>
                  <p className="text-[var(--admin-text-small)] text-[var(--admin-text-muted)]">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : null}

          {!isInitialLoading
            ? data.map((row, index) => {
                const keyValue = row[rowKey] ?? index;
                const isSelected = selectedRows?.has(row[rowKey]);
                return (
                  <tr
                    key={keyValue}
                    className={`border-b border-[var(--admin-border)] transition-colors ${onRowClick ? "cursor-pointer" : ""} ${isSelected ? "bg-[var(--admin-surface-selected)]" : "hover:bg-[var(--admin-surface-table-row-hover)]"}`}
                    style={{ height: rowHeight }}
                    onClick={() => onRowClick?.(row)}
                  >
                    {onSelectRow ? (
                      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow(row[rowKey])}
                          className="h-4 w-4 cursor-pointer rounded border-[var(--admin-border)] bg-[var(--admin-surface-input)]"
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={`${column.key}-${keyValue}`}
                        className={`px-4 py-3 text-[var(--admin-text-small)] text-[var(--admin-text-primary)] ${column.align === "center" ? "text-center" : column.align === "right" ? "text-right" : "text-left"}`}
                      >
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            : null}
        </tbody>
      </table>
    </div>
  );
}
