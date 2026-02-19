import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/auth/context/AuthContext";
import { adminQueryKeys, escalateIncident, getIncidents, resolveIncident } from "../api";
import { formatAdminDateTime } from "../utils/dateTime";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPage,
  AdminSelect,
  ConfirmDialog,
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

export default function IncidentsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const grid = useDataGridState({ initialPageSize: 20 });
  const setPagination = grid.setPagination;

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [busyRows, setBusyRows] = useState(new Set());
  const [confirmResolveId, setConfirmResolveId] = useState(null);

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

  const queryParams = useMemo(
    () => ({
      page: grid.pagination.pageIndex + 1,
      pageSize: grid.pagination.pageSize,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: searchQuery || undefined,
    }),
    [grid.pagination.pageIndex, grid.pagination.pageSize, searchQuery, statusFilter],
  );

  const incidentsQuery = useQuery({
    queryKey: adminQueryKeys.security.incidents(queryParams),
    enabled: Boolean(token),
    queryFn: ({ signal }) => getIncidents({ token, signal, ...queryParams }),
    placeholderData: (previous) => previous,
  });

  const escalateMutation = useMutation({
    mutationFn: async (id) => escalateIncident({ token, id }),
  });

  const resolveMutation = useMutation({
    mutationFn: async (id) => resolveIncident({ token, id }),
  });

  const setRowBusy = useCallback((id, value) => {
    setBusyRows((prev) => {
      const next = new Set(prev);
      if (value) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const rowsSource = useMemo(() => incidentsQuery.data?.items ?? [], [incidentsQuery.data?.items]);
  const pagination = incidentsQuery.data?.pagination ?? {
    page: grid.pagination.pageIndex + 1,
    pageSize: grid.pagination.pageSize,
    total: 0,
    totalPages: 1,
  };

  const rows = rowsSource;

  const stats = useMemo(
    () => [
      { label: "Open Incidents", value: rowsSource.filter((item) => item.status === "open").length, color: "var(--admin-status-error)" },
      { label: "Escalated", value: rowsSource.filter((item) => item.action_taken === "escalated").length, color: "var(--admin-status-warning)" },
      { label: "Total Attempts", value: rowsSource.reduce((sum, item) => sum + Number(item.attempt_count || 0), 0), color: "var(--admin-text-primary)" },
    ],
    [rowsSource],
  );

  const refreshIncidents = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.security.incidents() });
  }, [queryClient]);

  const handleEscalate = useCallback(async (id) => {
    if (!token) return;
    setFeedback(null);
    setMutationError(null);
    setRowBusy(id, true);

    try {
      await escalateMutation.mutateAsync(id);
      await refreshIncidents();
      setFeedback("Incident escalated.");
    } catch (error) {
      setMutationError(error?.message || "Failed to escalate incident.");
    } finally {
      setRowBusy(id, false);
    }
  }, [escalateMutation, refreshIncidents, setRowBusy, token]);

  const handleResolve = useCallback(async (id) => {
    if (!token) return;
    setFeedback(null);
    setMutationError(null);
    setRowBusy(id, true);

    try {
      await resolveMutation.mutateAsync(id);
      setConfirmResolveId(null);
      await refreshIncidents();
      setFeedback("Incident resolved.");
    } catch (error) {
      setMutationError(error?.message || "Failed to resolve incident.");
    } finally {
      setRowBusy(id, false);
    }
  }, [refreshIncidents, resolveMutation, setRowBusy, token]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "last_seen_at",
        header: "Detected",
        enableSorting: false,
        cell: ({ getValue }) => formatAdminDateTime(getValue()),
      },
      {
        accessorKey: "incident_type",
        header: "Type",
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <p className="text-[var(--admin-text-primary)]">{row.original.incident_type}</p>
            <p className="text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">{row.original.email || "n/a"}</p>
          </div>
        ),
      },
      {
        accessorKey: "ip",
        header: "IP",
        enableSorting: false,
      },
      {
        accessorKey: "severity",
        header: "Severity",
        enableSorting: false,
        cell: ({ getValue }) => <StatusBadge variant={getValue() === "high" || getValue() === "error" ? "error" : "warning"}>{getValue() || "n/a"}</StatusBadge>,
      },
      {
        accessorKey: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ getValue }) => <StatusBadge variant={getValue() === "open" ? "error" : getValue() === "resolved" ? "success" : "info"}>{getValue()}</StatusBadge>,
      },
      {
        accessorKey: "attempt_count",
        header: "Attempts",
        enableSorting: false,
        meta: { align: "right" },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => {
          const isBusy = busyRows.has(row.original.id);
          return (
            <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
              <AdminButton variant="secondary" size="sm" disabled={isBusy || row.original.status === "resolved"} loading={isBusy} onClick={() => handleEscalate(row.original.id)}>
                Escalate
              </AdminButton>
              <AdminButton
                variant="primary"
                size="sm"
                disabled={isBusy || row.original.status === "resolved"}
                onClick={() => setConfirmResolveId(row.original.id)}
              >
                Resolve
              </AdminButton>
            </div>
          );
        },
      },
    ],
    [busyRows, handleEscalate],
  );

  return (
    <AdminPage>
      <PageHeader
        title="Security Incidents"
        subtitle="Monitor and respond to suspicious activity"
        breadcrumbs={[{ label: "Security", path: "/admin/security/incidents" }, { label: "Incidents" }]}
        action={
          <AdminButton variant="secondary" icon={<span className="material-symbols-outlined text-base">refresh</span>} iconPosition="left" onClick={() => incidentsQuery.refetch()}>
            Refresh
          </AdminButton>
        }
      />

      <PageContent>
        {feedback ? <div className="mb-4 rounded-lg border border-[var(--admin-status-success-border)] bg-[var(--admin-status-success-bg)] px-4 py-3 text-[var(--admin-text-small)] text-[var(--admin-status-success)]">{feedback}</div> : null}
        {mutationError ? <div className="mb-4 rounded-lg border border-[var(--admin-status-error-border)] bg-[var(--admin-status-error-bg)] px-4 py-3 text-[var(--admin-text-small)] text-[var(--admin-status-error)]">{mutationError}</div> : null}

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3 xl:gap-6">
          {stats.map((stat) => (
            <AdminCard key={stat.label}>
              <p className="text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">{stat.label}</p>
              <p className="mt-2 text-[var(--admin-text-title)] font-bold" style={{ color: stat.color }}>
                {stat.value}
              </p>
            </AdminCard>
          ))}
        </div>

        <ToolbarRow>
          <AdminInput placeholder="Search incidents..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} icon={<span className="material-symbols-outlined text-lg">search</span>} className="w-full lg:max-w-sm xl:max-w-md lg:flex-1" />
          <AdminSelect
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="w-full lg:w-44 xl:w-48"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </AdminSelect>
        </ToolbarRow>

        <div className="admin-card-elevated overflow-hidden">
          {incidentsQuery.isError ? <ErrorState message={incidentsQuery.error?.message || "Failed to load incidents."} onRetry={() => incidentsQuery.refetch()} /> : null}

          {!incidentsQuery.isError && rows.length === 0 && !incidentsQuery.isPending ? <EmptyState icon="warning" title="No incidents" description="No incidents found for this page." /> : null}

          {!incidentsQuery.isError && (rows.length > 0 || incidentsQuery.isPending) ? (
            <>
              <DataGrid
                columns={columns}
                data={rows}
                getRowId={(row) => String(row.id)}
                pageCount={Math.max(1, pagination.totalPages || 1)}
                state={{ pagination: grid.pagination }}
                onPaginationChange={setPagination}
                isInitialLoading={incidentsQuery.isPending && !incidentsQuery.data}
                isRefreshing={incidentsQuery.isFetching && !incidentsQuery.isPending}
              />
              <DataGridPagination
                pageIndex={grid.pagination.pageIndex}
                pageSize={grid.pagination.pageSize}
                total={pagination.total || 0}
                totalPages={Math.max(1, pagination.totalPages || 1)}
                onPageChange={(nextPageIndex) => setPagination((prev) => ({ ...prev, pageIndex: nextPageIndex }))}
                onPageSizeChange={(nextPageSize) => setPagination({ pageIndex: 0, pageSize: nextPageSize })}
              />
            </>
          ) : null}
        </div>
      </PageContent>

      <ConfirmDialog
        isOpen={Boolean(confirmResolveId)}
        onClose={() => setConfirmResolveId(null)}
        onConfirm={() => handleResolve(confirmResolveId).catch(() => {})}
        title="Resolve incident"
        message="Mark this incident as resolved?"
        confirmText="Resolve"
        variant="primary"
        loading={confirmResolveId ? busyRows.has(confirmResolveId) : false}
      />
    </AdminPage>
  );
}
