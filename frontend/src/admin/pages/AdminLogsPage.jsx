import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/auth/context/AuthContext";
import { adminQueryKeys, getAdminLogs } from "../api";
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

export default function AdminLogsPage() {
  const { token } = useAuth();
  const grid = useDataGridState({ initialPageSize: 20 });
  const setPagination = grid.setPagination;
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    action: "",
    outcome: "",
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
      action: "",
      outcome: "",
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
      action: filters.action || undefined,
      outcome: filters.outcome || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    }),
    [filters.action, filters.dateFrom, filters.dateTo, filters.outcome, grid.pagination.pageIndex, grid.pagination.pageSize, searchQuery],
  );

  const logsQuery = useQuery({
    queryKey: adminQueryKeys.logs.admin(queryParams),
    enabled: Boolean(token),
    queryFn: ({ signal }) => getAdminLogs({ token, signal, ...queryParams }),
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

  const outcomeFromRow = (row) => {
    const metadata = row?.metadata;
    if (!metadata) {
      return "unknown";
    }

    if (typeof metadata === "object") {
      return metadata.outcome || "unknown";
    }

    if (typeof metadata === "string") {
      try {
        const parsed = JSON.parse(metadata);
        return parsed?.outcome || "unknown";
      } catch {
        return "unknown";
      }
    }

    return "unknown";
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "created_at",
        header: "Timestamp",
        enableSorting: false,
        cell: ({ getValue }) => formatAdminDateTime(getValue()),
      },
      {
        accessorKey: "admin_email",
        header: "Admin",
        enableSorting: false,
      },
      {
        accessorKey: "action",
        header: "Action",
        enableSorting: false,
        cell: ({ getValue }) => (
          <StatusBadge variant="info" size="sm">
            {getValue()}
          </StatusBadge>
        ),
      },
      {
        accessorKey: "entity_type",
        header: "Entity",
        enableSorting: false,
      },
      {
        accessorKey: "entity_id",
        header: "Entity ID",
        enableSorting: false,
        meta: { align: "right" },
      },
      {
        id: "outcome",
        header: "Outcome",
        enableSorting: false,
        cell: ({ row }) => {
          const value = outcomeFromRow(row.original);
          const variant = value === "success" ? "success" : value === "failed" ? "error" : "warning";
          return (
            <StatusBadge variant={variant} size="sm">
              {value}
            </StatusBadge>
          );
        },
      },
    ],
    [],
  );

  return (
    <AdminPage>
      <PageHeader title="Admin Logs" subtitle="Administrative audit trail" breadcrumbs={[{ label: "Logs", path: "/admin/logs/admin" }, { label: "Admin Logs" }]} />
      <PageContent>
        <ToolbarRow>
          <AdminInput
            placeholder="Search admin logs..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            icon={<span className="material-symbols-outlined text-lg">search</span>}
            className="w-full lg:max-w-sm xl:max-w-md lg:flex-1"
          />
          <AdminInput
            placeholder="Action"
            value={filters.action}
            onChange={(event) => updateFilter("action", event.target.value)}
            className="w-full sm:w-auto sm:min-w-56"
          />
          <AdminSelect value={filters.outcome} onChange={(event) => updateFilter("outcome", event.target.value)} className="w-full sm:w-auto sm:min-w-40">
            <option value="">All outcomes</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
            <option value="blocked">blocked</option>
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
          {logsQuery.isError ? <ErrorState message={logsQuery.error?.message || "Failed to load admin logs."} onRetry={() => logsQuery.refetch()} /> : null}

          {!logsQuery.isError && rows.length === 0 && !logsQuery.isPending ? <EmptyState icon="history" title="No admin logs" description="No log records for this page." /> : null}

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
