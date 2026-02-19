import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/auth/context/AuthContext";
import { adminQueryKeys, getAdminCategories, getAdminEvents, toggleEventActive } from "../api";
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

export default function EventsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const grid = useDataGridState({ initialPageSize: 20 });
  const setPagination = grid.setPagination;

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [feedback, setFeedback] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [busyRows, setBusyRows] = useState(new Set());

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const nextQuery = searchInput.trim();

      setSearchQuery((previous) => {
        if (previous === nextQuery) {
          return previous;
        }

        setPagination((previousPagination) =>
          previousPagination.pageIndex === 0
            ? previousPagination
            : { ...previousPagination, pageIndex: 0 },
        );

        return nextQuery;
      });
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchInput, setPagination]);

  const categoryQuery = useQuery({
    queryKey: adminQueryKeys.categories.list(),
    enabled: Boolean(token),
    queryFn: ({ signal }) => getAdminCategories({ token, signal }),
    staleTime: 5 * 60 * 1000,
    placeholderData: (previous) => previous,
  });

  const sorting = grid.sorting[0];
  const sortBy = sorting?.id || "starts_at";
  const sortDir = sorting ? (sorting.desc ? "desc" : "asc") : "desc";

  const queryParams = useMemo(() => {
    const isActive =
      activeFilter === "all"
        ? undefined
        : activeFilter === "active";

    const categoryId = categoryFilter === "all" ? undefined : Number(categoryFilter);

    return {
      page: grid.pagination.pageIndex + 1,
      pageSize: grid.pagination.pageSize,
      search: searchQuery || undefined,
      isActive,
      categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
      sortBy,
      sortDir,
    };
  }, [activeFilter, categoryFilter, grid.pagination.pageIndex, grid.pagination.pageSize, searchQuery, sortBy, sortDir]);

  const eventsQuery = useQuery({
    queryKey: adminQueryKeys.events.list(queryParams),
    enabled: Boolean(token),
    queryFn: ({ signal }) =>
      getAdminEvents({
        token,
        signal,
        ...queryParams,
      }),
    placeholderData: (previous) => previous,
  });

  const toggleMutation = useMutation({
    mutationFn: async (id) => toggleEventActive({ token, id }),
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

  const handleToggleActive = useCallback(
    async (id) => {
      if (!token) {
        return;
      }

      setFeedback(null);
      setMutationError(null);
      setRowBusy(id, true);

      try {
        await toggleMutation.mutateAsync(id);
        await queryClient.invalidateQueries({ queryKey: adminQueryKeys.events.all });
        setFeedback("Event status updated.");
      } catch (error) {
        setMutationError(error?.message || "Failed to update event status.");
      } finally {
        setRowBusy(id, false);
      }
    },
    [queryClient, setRowBusy, toggleMutation, token],
  );

  const categories = Array.isArray(categoryQuery.data) ? categoryQuery.data : [];
  const events = eventsQuery.data?.items ?? [];
  const pagination = eventsQuery.data?.pagination ?? {
    page: grid.pagination.pageIndex + 1,
    pageSize: grid.pagination.pageSize,
    total: 0,
    totalPages: 1,
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Event",
        enableSorting: true,
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-[var(--admin-text-primary)]">{row.original.title}</p>
            <p className="text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">
              {row.original.city} • {row.original.venue}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "category_name",
        header: "Category",
        enableSorting: false,
      },
      {
        accessorKey: "starts_at",
        header: "Starts",
        enableSorting: true,
        cell: ({ getValue }) => formatAdminDateTime(getValue()),
      },
      {
        accessorKey: "is_free",
        header: "Type",
        enableSorting: false,
        cell: ({ getValue }) => <StatusBadge variant={getValue() ? "neutral" : "info"}>{getValue() ? "Free" : "Paid"}</StatusBadge>,
      },
      {
        accessorKey: "is_active",
        header: "Status",
        enableSorting: false,
        cell: ({ getValue }) => <StatusBadge variant={getValue() ? "success" : "warning"}>{getValue() ? "Active" : "Inactive"}</StatusBadge>,
      },
      {
        accessorKey: "price",
        header: "Price",
        enableSorting: false,
        meta: { align: "right" },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <div onClick={(event) => event.stopPropagation()}>
            <AdminButton
              variant="secondary"
              size="sm"
              loading={busyRows.has(row.original.id)}
              onClick={() => handleToggleActive(row.original.id)}
              icon={<span className="material-symbols-outlined text-base">power_settings_new</span>}
              iconPosition="left"
            >
              Toggle
            </AdminButton>
          </div>
        ),
      },
    ],
    [busyRows, handleToggleActive],
  );

  return (
    <AdminPage>
      <PageHeader title="Events" subtitle={`Moderate ${pagination.total} events`} />

      <PageContent>
        {feedback ? <div className="mb-4 rounded-lg border border-[var(--admin-status-success-border)] bg-[var(--admin-status-success-bg)] px-4 py-3 text-[var(--admin-text-small)] text-[var(--admin-status-success)]">{feedback}</div> : null}
        {mutationError ? <div className="mb-4 rounded-lg border border-[var(--admin-status-error-border)] bg-[var(--admin-status-error-bg)] px-4 py-3 text-[var(--admin-text-small)] text-[var(--admin-status-error)]">{mutationError}</div> : null}

        <ToolbarRow>
          <AdminInput
            placeholder="Search events..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            icon={<span className="material-symbols-outlined text-lg">search</span>}
            className="w-full lg:max-w-sm xl:max-w-md lg:flex-1"
          />

          <AdminSelect
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              grid.setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="w-full lg:w-44 xl:w-48"
          >
            <option value="all">All Categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </AdminSelect>

          <AdminSelect
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value);
              grid.setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="w-full lg:w-40 xl:w-44"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </AdminSelect>
        </ToolbarRow>

        <div className="admin-card-elevated overflow-hidden">
          {eventsQuery.isError ? <ErrorState message={eventsQuery.error?.message || "Failed to load events."} onRetry={() => eventsQuery.refetch()} /> : null}

          {!eventsQuery.isError && events.length === 0 && !eventsQuery.isPending ? (
            <EmptyState icon="event_busy" title="No events found" description="Try changing filters or search query." />
          ) : null}

          {!eventsQuery.isError && (events.length > 0 || eventsQuery.isPending) ? (
            <>
              <DataGrid
                columns={columns}
                data={events}
                getRowId={(row) => String(row.id)}
                pageCount={Math.max(1, pagination.totalPages || 1)}
                state={{
                  pagination: grid.pagination,
                  sorting: grid.sorting,
                }}
                onPaginationChange={grid.setPagination}
                onSortingChange={grid.setSorting}
                isInitialLoading={eventsQuery.isPending && !eventsQuery.data}
                isRefreshing={eventsQuery.isFetching && !eventsQuery.isPending}
              />
              <DataGridPagination
                pageIndex={grid.pagination.pageIndex}
                pageSize={grid.pagination.pageSize}
                total={pagination.total || 0}
                totalPages={Math.max(1, pagination.totalPages || 1)}
                onPageChange={(nextPageIndex) => grid.setPagination((prev) => ({ ...prev, pageIndex: nextPageIndex }))}
                onPageSizeChange={(nextPageSize) =>
                  grid.setPagination({
                    pageIndex: 0,
                    pageSize: nextPageSize,
                  })
                }
              />
            </>
          ) : null}
        </div>
      </PageContent>
    </AdminPage>
  );
}
