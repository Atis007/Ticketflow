import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/auth/context/AuthContext";
import { adminQueryKeys, createIpBlock, getBlocks, liftBlock } from "../api";
import { formatAdminDateTime } from "../utils/dateTime";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminModal,
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

function initialBlockForm() {
  return {
    ip: "",
    reason: "Manual admin block",
    isPermanent: true,
    minutes: 120,
  };
}

export default function IPBlocksPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const grid = useDataGridState({ initialPageSize: 20 });
  const setPagination = grid.setPagination;

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [busyRows, setBusyRows] = useState(new Set());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [blockForm, setBlockForm] = useState(() => initialBlockForm());
  const [confirmLiftId, setConfirmLiftId] = useState(null);

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
      search: searchQuery || undefined,
    }),
    [grid.pagination.pageIndex, grid.pagination.pageSize, searchQuery],
  );

  const blocksQuery = useQuery({
    queryKey: adminQueryKeys.security.blocks(queryParams),
    enabled: Boolean(token),
    queryFn: ({ signal }) => getBlocks({ token, signal, ...queryParams }),
    placeholderData: (previous) => previous,
  });

  const createBlockMutation = useMutation({
    mutationFn: async (payload) => createIpBlock({ token, payload }),
  });

  const liftBlockMutation = useMutation({
    mutationFn: async (id) => liftBlock({ token, id }),
  });

  const setRowBusy = useCallback((id, isBusy) => {
    setBusyRows((prev) => {
      const next = new Set(prev);
      if (isBusy) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const rawItems = useMemo(() => blocksQuery.data?.items ?? [], [blocksQuery.data?.items]);
  const pagination = blocksQuery.data?.pagination ?? {
    page: grid.pagination.pageIndex + 1,
    pageSize: grid.pagination.pageSize,
    total: 0,
    totalPages: 1,
  };

  const rows = rawItems;

  const stats = useMemo(
    () => [
      { label: "Active Blocks", value: rawItems.filter((item) => item.status === "active").length, color: "var(--admin-status-error)" },
      { label: "Lifted Blocks", value: rawItems.filter((item) => item.status === "lifted").length, color: "var(--admin-text-primary)" },
      { label: "Total Entries", value: rawItems.length, color: "var(--admin-text-primary)" },
    ],
    [rawItems],
  );

  const refreshWithMessage = useCallback(
    async (message) => {
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.security.blocks() });
      setFeedback(message);
      setMutationError(null);
    },
    [queryClient],
  );

  const submitCreateBlock = useCallback(async () => {
    if (!token) {
      return;
    }

    setFeedback(null);
    setMutationError(null);

    try {
      await createBlockMutation.mutateAsync({
        ip: blockForm.ip,
        reason: blockForm.reason,
        isPermanent: blockForm.isPermanent,
        minutes: Number(blockForm.minutes || 120),
      });

      setCreateModalOpen(false);
      setBlockForm(initialBlockForm());
      await refreshWithMessage("IP block created.");
    } catch (error) {
      setMutationError(error?.message || "Failed to create block.");
    }
  }, [blockForm, createBlockMutation, refreshWithMessage, token]);

  const handleLiftBlock = useCallback(
    async (id) => {
      if (!token) {
        return;
      }

      setFeedback(null);
      setMutationError(null);
      setRowBusy(id, true);

      try {
        await liftBlockMutation.mutateAsync(id);
        setConfirmLiftId(null);
        await refreshWithMessage("Block lifted.");
      } catch (error) {
        setMutationError(error?.message || "Failed to lift block.");
      } finally {
        setRowBusy(id, false);
      }
    },
    [liftBlockMutation, refreshWithMessage, setRowBusy, token],
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: "ip",
        header: "IP Address",
        enableSorting: false,
      },
      {
        accessorKey: "reason",
        header: "Reason",
        enableSorting: false,
      },
      {
        accessorKey: "created_source",
        header: "Source",
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <p className="text-[var(--admin-text-primary)]">{row.original.created_source || "n/a"}</p>
            <p className="text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">{row.original.created_by ? `by #${row.original.created_by}` : ""}</p>
          </div>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Blocked At",
        enableSorting: false,
        cell: ({ getValue }) => formatAdminDateTime(getValue()),
      },
      {
        accessorKey: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ getValue }) => <StatusBadge variant={getValue() === "active" ? "error" : "neutral"}>{getValue()}</StatusBadge>,
      },
      {
        accessorKey: "blocked_until",
        header: "Expires",
        enableSorting: false,
        cell: ({ row }) => <span>{row.original.is_permanent ? "Never" : formatAdminDateTime(row.original.blocked_until)}</span>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
            <AdminButton
              variant="secondary"
              size="sm"
              disabled={row.original.status !== "active"}
              loading={busyRows.has(row.original.id)}
              onClick={() => setConfirmLiftId(row.original.id)}
            >
              Lift
            </AdminButton>
          </div>
        ),
      },
    ],
    [busyRows],
  );

  const isBusy = createBlockMutation.isPending || liftBlockMutation.isPending;

  return (
    <AdminPage>
      <PageHeader
        title="IP Blocks"
        subtitle="Manage active and historical blocks"
        breadcrumbs={[{ label: "Security", path: "/admin/security/blocks" }, { label: "IP Blocks" }]}
        action={
          <AdminButton variant="primary" icon={<span className="material-symbols-outlined text-base">add</span>} iconPosition="left" onClick={() => setCreateModalOpen(true)}>
            Add Block
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
          <AdminInput placeholder="Search blocks..." value={searchInput} onChange={(event) => setSearchInput(event.target.value)} icon={<span className="material-symbols-outlined text-lg">search</span>} className="w-full lg:max-w-sm xl:max-w-md lg:flex-1" />
        </ToolbarRow>

        <div className="admin-card-elevated overflow-hidden">
          {blocksQuery.isError ? <ErrorState message={blocksQuery.error?.message || "Failed to load blocks."} onRetry={() => blocksQuery.refetch()} /> : null}

          {!blocksQuery.isError && rows.length === 0 && !blocksQuery.isPending ? <EmptyState icon="gpp_bad" title="No blocks" description="No blocks found for this page." /> : null}

          {!blocksQuery.isError && (rows.length > 0 || blocksQuery.isPending) ? (
            <>
              <DataGrid
                columns={columns}
                data={rows}
                getRowId={(row) => String(row.id)}
                pageCount={Math.max(1, pagination.totalPages || 1)}
                state={{ pagination: grid.pagination }}
                onPaginationChange={setPagination}
                isInitialLoading={blocksQuery.isPending && !blocksQuery.data}
                isRefreshing={blocksQuery.isFetching && !blocksQuery.isPending}
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

      <AdminModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create IP Block"
        footer={
          <>
            <AdminButton variant="ghost" onClick={() => setCreateModalOpen(false)} disabled={isBusy}>
              Cancel
            </AdminButton>
            <AdminButton variant="primary" onClick={() => submitCreateBlock().catch(() => {})} loading={isBusy}>
              Create
            </AdminButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <AdminInput label="IP Address" value={blockForm.ip} onChange={(event) => setBlockForm((prev) => ({ ...prev, ip: event.target.value }))} />
          <AdminInput label="Reason" value={blockForm.reason} onChange={(event) => setBlockForm((prev) => ({ ...prev, reason: event.target.value }))} />
          <AdminSelect
            label="Duration"
            value={blockForm.isPermanent ? "permanent" : "temporary"}
            onChange={(event) => setBlockForm((prev) => ({ ...prev, isPermanent: event.target.value === "permanent" }))}
          >
            <option value="permanent">Permanent</option>
            <option value="temporary">Temporary</option>
          </AdminSelect>
          {!blockForm.isPermanent ? (
            <AdminInput
              label="Minutes"
              type="number"
              min="1"
              value={String(blockForm.minutes)}
              onChange={(event) => setBlockForm((prev) => ({ ...prev, minutes: Number(event.target.value || 120) }))}
            />
          ) : null}
        </div>
      </AdminModal>

      <ConfirmDialog
        isOpen={Boolean(confirmLiftId)}
        onClose={() => setConfirmLiftId(null)}
        onConfirm={() => handleLiftBlock(confirmLiftId).catch(() => {})}
        title="Lift block"
        message="Lift this active block?"
        confirmText="Lift"
        variant="primary"
        loading={confirmLiftId ? busyRows.has(confirmLiftId) : false}
      />
    </AdminPage>
  );
}
