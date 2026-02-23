import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/auth/context/AuthContext";
import { adminQueryKeys, getEventChangeLogs } from "../api";
import { formatAdminDateTime } from "../utils/dateTime";
import {
  AdminButton,
  AdminInput,
  AdminPage,
  AdminSelect,
  DataGrid,
  DataGridPagination,
  EmptyState,
  ErrorState,
  PageContent,
  PageHeader,
  StatusBadge,
  ToolbarRow,
  useDataGridState,
} from "../components";

export default function EventChangeLogsPage() {
  const { token } = useAuth();
  const grid = useDataGridState({ initialPageSize: 20 });
  const setPagination = grid.setPagination;
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    field: "",
    dateFrom: "",
    dateTo: "",
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const normalized = searchInput.trim();
      const nextQuery = normalized.length === 0 || normalized.length >= 2 ? normalized : "";

      setSearchQuery((previous) => {
        if (previous === nextQuery) {
          return previous;
        }

        setPagination((previousPagination) => ({ ...previousPagination, pageIndex: 0 }));
        return nextQuery;
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput, setPagination]);

  const updateFilter = (key, value) => {
    setFilters((previous) => {
      if (previous[key] === value) {
        return previous;
      }

      setPagination((previousPagination) => ({ ...previousPagination, pageIndex: 0 }));
      return { ...previous, [key]: value };
    });
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setFilters({
      field: "",
      dateFrom: "",
      dateTo: "",
    });
    setPagination({ pageIndex: 0, pageSize: grid.pagination.pageSize });
  };

  const queryParams = useMemo(
    () => ({
      page: grid.pagination.pageIndex + 1,
      pageSize: grid.pagination.pageSize,
      search: searchQuery || undefined,
      field: filters.field || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    }),
    [filters.dateFrom, filters.dateTo, filters.field, grid.pagination.pageIndex, grid.pagination.pageSize, searchQuery],
  );

  const logsQuery = useQuery({
    queryKey: adminQueryKeys.logs.eventChanges(queryParams),
    enabled: Boolean(token),
    queryFn: ({ signal }) => getEventChangeLogs({ token, signal, ...queryParams }),
    placeholderData: (previous) => previous,
  });

  const rawItems = useMemo(() => logsQuery.data?.items ?? [], [logsQuery.data?.items]);
  const pagination = logsQuery.data?.pagination ?? {
    page: grid.pagination.pageIndex + 1,
    pageSize: grid.pagination.pageSize,
    total: 0,
    totalPages: 1,
  };

  const rows = rawItems;

  const columns = useMemo(
    () => [
      {
        accessorKey: "changed_at",
        header: "Timestamp",
        enableSorting: false,
        cell: ({ getValue }) => formatAdminDateTime(getValue()),
      },
      {
        accessorKey: "event_title",
        header: "Event",
        enableSorting: false,
      },
      {
        accessorKey: "field",
        header: "Field",
        enableSorting: false,
        cell: ({ getValue }) => (
          <StatusBadge variant="info" size="sm">
            {getValue()}
          </StatusBadge>
        ),
      },
      {
        accessorKey: "old_value",
        header: "Old",
        enableSorting: false,
      },
      {
        accessorKey: "new_value",
        header: "New",
        enableSorting: false,
      },
      {
        accessorKey: "changed_by_email",
        header: "Changed By",
        enableSorting: false,
      },
    ],
    [],
  );

  return (
    <AdminPage>
      <PageHeader
        title="Event Change Logs"
        subtitle="Track event edits"
        breadcrumbs={[{ label: "Logs", path: "/admin/logs/event-changes" }, { label: "Event Changes" }]}
      />
      <PageContent>
        <ToolbarRow>
          <AdminInput
            placeholder="Search event changes..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            icon={<span className="material-symbols-outlined text-lg">search</span>}
            className="w-full lg:max-w-sm xl:max-w-md lg:flex-1"
          />
          <AdminSelect value={filters.field} onChange={(event) => updateFilter("field", event.target.value)} className="w-full sm:w-auto sm:min-w-48">
            <option value="">All fields</option>
            <option value="title">title</option>
            <option value="slug">slug</option>
            <option value="category_id">category_id</option>
            <option value="subcategory_id">subcategory_id</option>
            <option value="starts_at">starts_at</option>
            <option value="ends_at">ends_at</option>
            <option value="is_active">is_active</option>
            <option value="is_free">is_free</option>
            <option value="price">price</option>
            <option value="capacity">capacity</option>
          </AdminSelect>
          <AdminInput
            type="datetime-local"
            value={filters.dateFrom}
            onChange={(event) => updateFilter("dateFrom", event.target.value)}
            className="w-full sm:w-auto sm:min-w-52"
          />
          <AdminInput
            type="datetime-local"
            value={filters.dateTo}
            onChange={(event) => updateFilter("dateTo", event.target.value)}
            className="w-full sm:w-auto sm:min-w-52"
          />
          <AdminButton variant="ghost" onClick={resetFilters} className="w-full sm:w-auto">
            Reset
          </AdminButton>
        </ToolbarRow>

        <div className="admin-card-elevated overflow-hidden">
          {logsQuery.isError ? <ErrorState message={logsQuery.error?.message || "Failed to load event change logs."} onRetry={() => logsQuery.refetch()} /> : null}

          {!logsQuery.isError && rows.length === 0 && !logsQuery.isPending ? <EmptyState icon="history_toggle_off" title="No change logs" description="No log records for this page." /> : null}

          {!logsQuery.isError && (rows.length > 0 || logsQuery.isPending) ? (
            <>
              <DataGrid
                columns={columns}
                data={rows}
                getRowId={(row) => String(row.id)}
                pageCount={Math.max(1, pagination.totalPages || 1)}
                state={{ pagination: grid.pagination }}
                onPaginationChange={grid.setPagination}
                isInitialLoading={logsQuery.isPending && !logsQuery.data}
                isRefreshing={logsQuery.isFetching && !logsQuery.isPending}
              />
              <DataGridPagination
                pageIndex={grid.pagination.pageIndex}
                pageSize={grid.pagination.pageSize}
                total={pagination.total || 0}
                totalPages={Math.max(1, pagination.totalPages || 1)}
                onPageChange={(nextPageIndex) => grid.setPagination((prev) => ({ ...prev, pageIndex: nextPageIndex }))}
                onPageSizeChange={(nextPageSize) => grid.setPagination({ pageIndex: 0, pageSize: nextPageSize })}
              />
            </>
          ) : null}
        </div>
      </PageContent>
    </AdminPage>
  );
}
