import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/auth/context/AuthContext";
import { adminQueryKeys, getDeviceLogs } from "../api";
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

export default function DeviceLogsPage() {
  const { token } = useAuth();
  const grid = useDataGridState({ initialPageSize: 20 });
  const setPagination = grid.setPagination;

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    action: "",
    ip: "",
    device_type: "",
    platform: "",
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
      ip: "",
      device_type: "",
      platform: "",
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
      ip: filters.ip || undefined,
      device_type: filters.device_type || undefined,
      platform: filters.platform || undefined,
      outcome: filters.outcome || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    }),
    [filters.action, filters.dateFrom, filters.dateTo, filters.device_type, filters.ip, filters.outcome, filters.platform, grid.pagination.pageIndex, grid.pagination.pageSize, searchQuery],
  );

  const logsQuery = useQuery({
    queryKey: adminQueryKeys.logs.device(queryParams),
    enabled: Boolean(token),
    queryFn: ({ signal }) => getDeviceLogs({ token, signal, ...queryParams }),
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
        accessorKey: "created_at",
        header: "Timestamp",
        enableSorting: false,
        cell: ({ getValue }) => formatAdminDateTime(getValue()),
      },
      {
        accessorKey: "email",
        header: "User",
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <p className="text-[var(--admin-text-primary)]">{row.original.email || "unknown"}</p>
            <p className="text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">{row.original.ip}</p>
          </div>
        ),
      },
      {
        accessorKey: "user_agent",
        header: "Device",
        enableSorting: false,
      },
      {
        accessorKey: "platform",
        header: "Platform",
        enableSorting: false,
        cell: ({ getValue }) => <StatusBadge variant="neutral">{getValue() || "unknown"}</StatusBadge>,
      },
      {
        accessorKey: "device_type",
        header: "Type",
        enableSorting: false,
        cell: ({ getValue }) => <StatusBadge variant="neutral">{getValue() || "unknown"}</StatusBadge>,
      },
      {
        accessorKey: "action",
        header: "Action",
        enableSorting: false,
        cell: ({ getValue }) => <StatusBadge variant="info">{getValue() || "n/a"}</StatusBadge>,
      },
      {
        accessorKey: "outcome",
        header: "Outcome",
        enableSorting: false,
        cell: ({ getValue }) => {
          const value = getValue() || "unknown";
          const variant = value === "success" ? "success" : value === "failed" ? "error" : "warning";
          return <StatusBadge variant={variant}>{value}</StatusBadge>;
        },
      },
    ],
    [],
  );

  return (
    <AdminPage>
      <PageHeader title="Device Logs" subtitle="User device activity" breadcrumbs={[{ label: "Logs", path: "/admin/logs/device" }, { label: "Device Logs" }]} />
      <PageContent>
        <ToolbarRow>
          <AdminInput
            placeholder="Search device logs..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            icon={<span className="material-symbols-outlined text-lg">search</span>}
            className="w-full lg:max-w-sm xl:max-w-md lg:flex-1"
          />
          <AdminInput
            placeholder="IP"
            value={filters.ip}
            onChange={(event) => updateFilter("ip", event.target.value)}
            className="w-full sm:w-auto sm:min-w-40"
          />
          <AdminSelect value={filters.platform} onChange={(event) => updateFilter("platform", event.target.value)} className="w-full sm:w-auto sm:min-w-40">
            <option value="">All platforms</option>
            <option value="web">web</option>
            <option value="admin">admin</option>
            <option value="mobile">mobile</option>
          </AdminSelect>
          <AdminSelect value={filters.device_type} onChange={(event) => updateFilter("device_type", event.target.value)} className="w-full sm:w-auto sm:min-w-40">
            <option value="">All device types</option>
            <option value="desktop">desktop</option>
            <option value="mobile">mobile</option>
            <option value="tablet">tablet</option>
            <option value="bot">bot</option>
            <option value="unknown">unknown</option>
          </AdminSelect>
          <AdminSelect value={filters.outcome} onChange={(event) => updateFilter("outcome", event.target.value)} className="w-full sm:w-auto sm:min-w-40">
            <option value="">All outcomes</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
            <option value="blocked">blocked</option>
          </AdminSelect>
          <AdminInput
            placeholder="Action"
            value={filters.action}
            onChange={(event) => updateFilter("action", event.target.value)}
            className="w-full sm:w-auto sm:min-w-52"
          />
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
          {logsQuery.isError ? <ErrorState message={logsQuery.error?.message || "Failed to load device logs."} onRetry={() => logsQuery.refetch()} /> : null}

          {!logsQuery.isError && rows.length === 0 && !logsQuery.isPending ? <EmptyState icon="devices" title="No device logs" description="No log records for this page." /> : null}

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
