/* eslint-disable react-hooks/incompatible-library */
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

export function DataGrid({
  columns,
  data,
  pageCount,
  state,
  getRowId,
  onRowClick,
  onPaginationChange,
  onSortingChange,
  onRowSelectionChange,
  manualPagination = true,
  manualSorting = true,
  enableRowSelection = false,
  isInitialLoading = false,
  isRefreshing = false,
  emptyMessage = "No data available",
}) {
  const resolvedState = state ?? {
    pagination: { pageIndex: 0, pageSize: 20 },
    sorting: [],
    rowSelection: {},
  };

  const table = useReactTable({
    data,
    columns,
    state: resolvedState,
    getRowId,
    pageCount,
    manualPagination,
    manualSorting,
    enableRowSelection,
    onPaginationChange: onPaginationChange ?? (() => {}),
    onSortingChange: onSortingChange ?? (() => {}),
    onRowSelectionChange: onRowSelectionChange ?? (() => {}),
    getCoreRowModel: getCoreRowModel(),
  });

  const visibleRows = table.getRowModel().rows;
  const colSpan = table.getVisibleLeafColumns().length;

  return (
    <div className="relative admin-scrollbar w-full overflow-x-auto rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)]">
      {isRefreshing ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 bg-[var(--admin-interactive-primary)] opacity-80" />
      ) : null}

      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-table-header)]">
              {headerGroup.headers.map((header) => {
                const align = header.column.columnDef?.meta?.align;

                return (
                  <th
                    key={header.id}
                    className={`px-4 py-3 text-[var(--admin-text-caption)] font-semibold tracking-wider text-[var(--admin-text-secondary)] uppercase ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} ${header.column.getCanSort() ? "cursor-pointer select-none" : ""}`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder ? null : (
                      <div className={`flex items-center gap-2 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() ? (
                          <span className="material-symbols-outlined text-base">
                            {header.column.getIsSorted() === "asc" ? "arrow_upward" : header.column.getIsSorted() === "desc" ? "arrow_downward" : "unfold_more"}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        <tbody>
          {isInitialLoading
            ? Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="border-b border-[var(--admin-border)]">
                  {Array.from({ length: colSpan }).map((__, innerIndex) => (
                    <td key={`skeleton-cell-${index}-${innerIndex}`} className="px-4 py-3">
                      <div className="admin-skeleton h-4 w-3/4 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            : null}

          {!isInitialLoading && visibleRows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-5xl text-[var(--admin-text-disabled)]">inbox</span>
                  <p className="text-[var(--admin-text-small)] text-[var(--admin-text-muted)]">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : null}

          {!isInitialLoading
            ? visibleRows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-[var(--admin-border)] transition-colors ${onRowClick ? "cursor-pointer" : ""} ${row.getIsSelected() ? "bg-[var(--admin-surface-selected)]" : "hover:bg-[var(--admin-surface-table-row-hover)]"}`}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-4 py-3 text-[var(--admin-text-small)] text-[var(--admin-text-primary)] ${cell.column.columnDef?.meta?.align === "right" ? "text-right" : cell.column.columnDef?.meta?.align === "center" ? "text-center" : "text-left"}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            : null}
        </tbody>
      </table>
    </div>
  );
}
