import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/auth/context/AuthContext";
import {
  adminQueryKeys,
  bulkDisableUsers,
  bulkEnableUsers,
  createUser,
  deleteUser,
  disableUser,
  enableUser,
  getUser,
  getUsers,
  updateUser,
} from "../api";
import {
  AdminButton,
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
import { formatAdminDateTime } from "../utils/dateTime";

function initialFormState() {
  return {
    fullname: "",
    email: "",
    password: "",
    role: "user",
  };
}

function friendlyError(error, fallback) {
  return error?.message || fallback;
}

export default function UsersPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const grid = useDataGridState({ initialPageSize: 20 });
  const setPagination = grid.setPagination;
  const resetSelection = grid.resetSelection;

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [disabledFilter, setDisabledFilter] = useState("all");

  const [feedback, setFeedback] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [busyRows, setBusyRows] = useState(new Set());
  const [isFetchingUser, setIsFetchingUser] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [formState, setFormState] = useState(() => initialFormState());
  const [editingUserId, setEditingUserId] = useState(null);

  const [confirmAction, setConfirmAction] = useState(null);

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

  const queryParams = useMemo(() => {
    const isDisabled =
      disabledFilter === "all"
        ? undefined
        : disabledFilter === "disabled";

    return {
      page: grid.pagination.pageIndex + 1,
      pageSize: grid.pagination.pageSize,
      search: searchQuery || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
      isDisabled,
    };
  }, [disabledFilter, grid.pagination.pageIndex, grid.pagination.pageSize, roleFilter, searchQuery]);

  const usersQuery = useQuery({
    queryKey: adminQueryKeys.users.list(queryParams),
    enabled: Boolean(token),
    queryFn: ({ signal }) =>
      getUsers({
        token,
        signal,
        ...queryParams,
      }),
    placeholderData: (previous) => previous,
  });

  const users = usersQuery.data?.items ?? [];
  const pagination = usersQuery.data?.pagination ?? {
    page: grid.pagination.pageIndex + 1,
    pageSize: grid.pagination.pageSize,
    total: 0,
    totalPages: 1,
  };

  useEffect(() => {
    resetSelection();
  }, [resetSelection, usersQuery.data?.items]);

  const selectedIds = useMemo(
    () =>
      Object.entries(grid.rowSelection)
        .filter(([, selected]) => Boolean(selected))
        .map(([id]) => Number(id)),
    [grid.rowSelection],
  );

  const clearMessages = useCallback(() => {
    setFeedback(null);
    setMutationError(null);
  }, []);

  const invalidateUsers = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.users.all });
  }, [queryClient]);

  const saveUserMutation = useMutation({
    mutationFn: async ({ mode, id, payload }) => {
      if (mode === "create") {
        return createUser({ token, payload });
      }

      return updateUser({ token, id, payload });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => deleteUser({ token, id }),
  });

  const disableMutation = useMutation({
    mutationFn: async ({ id, reason }) => disableUser({ token, id, payload: { reason } }),
  });

  const enableMutation = useMutation({
    mutationFn: async (id) => enableUser({ token, id }),
  });

  const bulkDisableMutation = useMutation({
    mutationFn: async (ids) =>
      bulkDisableUsers({
        token,
        payload: {
          ids,
          reason: "Disabled by admin",
        },
      }),
  });

  const bulkEnableMutation = useMutation({
    mutationFn: async (ids) =>
      bulkEnableUsers({
        token,
        payload: { ids },
      }),
  });

  const isBusy =
    isFetchingUser ||
    saveUserMutation.isPending ||
    deleteMutation.isPending ||
    disableMutation.isPending ||
    enableMutation.isPending ||
    bulkDisableMutation.isPending ||
    bulkEnableMutation.isPending;

  const openCreateModal = useCallback(() => {
    clearMessages();
    setModalMode("create");
    setEditingUserId(null);
    setFormState(initialFormState());
    setIsModalOpen(true);
  }, [clearMessages]);

  const openEditModal = useCallback(
    async (id) => {
      if (!token) {
        return;
      }

      clearMessages();
      setIsFetchingUser(true);

      try {
        const userData = await getUser({ token, id });
        setModalMode("edit");
        setEditingUserId(id);
        setFormState({
          fullname: userData?.fullname || "",
          email: userData?.email || "",
          password: "",
          role: userData?.role || "user",
        });
        setIsModalOpen(true);
      } catch (error) {
        setMutationError(friendlyError(error, "Failed to load user details."));
      } finally {
        setIsFetchingUser(false);
      }
    },
    [clearMessages, token],
  );

  const submitModal = useCallback(async () => {
    if (!token) {
      return;
    }

    clearMessages();

    try {
      if (modalMode === "create") {
        await saveUserMutation.mutateAsync({
          mode: "create",
          payload: {
            fullname: formState.fullname,
            email: formState.email,
            password: formState.password,
            role: formState.role,
          },
        });
        setFeedback("User created successfully.");
      } else if (editingUserId) {
        await saveUserMutation.mutateAsync({
          mode: "edit",
          id: editingUserId,
          payload: {
            fullname: formState.fullname,
            role: formState.role,
          },
        });
        setFeedback("User updated successfully.");
      }

      setIsModalOpen(false);
      await invalidateUsers();
    } catch (error) {
      setMutationError(friendlyError(error, "User save failed."));
    }
  }, [clearMessages, editingUserId, formState, invalidateUsers, modalMode, saveUserMutation, token]);

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

  const executeDelete = useCallback(
    async (id) => {
      clearMessages();
      setRowBusy(id, true);

      try {
        await deleteMutation.mutateAsync(id);
        setConfirmAction(null);
        setFeedback("User deleted successfully.");
        await invalidateUsers();
      } catch (error) {
        setMutationError(friendlyError(error, "Delete failed."));
      } finally {
        setRowBusy(id, false);
      }
    },
    [clearMessages, deleteMutation, invalidateUsers, setRowBusy],
  );

  const executeDisable = useCallback(
    async (id) => {
      clearMessages();
      setRowBusy(id, true);

      try {
        await disableMutation.mutateAsync({ id, reason: "Disabled by admin" });
        setConfirmAction(null);
        setFeedback("User disabled successfully.");
        await invalidateUsers();
      } catch (error) {
        setMutationError(friendlyError(error, "Disable failed."));
      } finally {
        setRowBusy(id, false);
      }
    },
    [clearMessages, disableMutation, invalidateUsers, setRowBusy],
  );

  const executeEnable = useCallback(
    async (id) => {
      clearMessages();
      setRowBusy(id, true);

      try {
        await enableMutation.mutateAsync(id);
        setFeedback("User enabled successfully.");
        await invalidateUsers();
      } catch (error) {
        setMutationError(friendlyError(error, "Enable failed."));
      } finally {
        setRowBusy(id, false);
      }
    },
    [clearMessages, enableMutation, invalidateUsers, setRowBusy],
  );

  const executeBulkDisable = useCallback(async () => {
    if (selectedIds.length === 0) {
      return;
    }

    clearMessages();

    try {
      await bulkDisableMutation.mutateAsync(selectedIds);
      grid.resetSelection();
      setConfirmAction(null);
      setFeedback("Selected users disabled.");
      await invalidateUsers();
    } catch (error) {
      setMutationError(friendlyError(error, "Bulk disable failed."));
    }
  }, [bulkDisableMutation, clearMessages, grid, invalidateUsers, selectedIds]);

  const executeBulkEnable = useCallback(async () => {
    if (selectedIds.length === 0) {
      return;
    }

    clearMessages();

    try {
      await bulkEnableMutation.mutateAsync(selectedIds);
      grid.resetSelection();
      setFeedback("Selected users enabled.");
      await invalidateUsers();
    } catch (error) {
      setMutationError(friendlyError(error, "Bulk enable failed."));
    }
  }, [bulkEnableMutation, clearMessages, grid, invalidateUsers, selectedIds]);

  const statusFor = useCallback((row) => {
    if (row.is_disabled) {
      return { label: "Disabled", variant: "error" };
    }

    if (row.is_active) {
      return { label: "Active", variant: "success" };
    }

    return { label: "Unverified", variant: "warning" };
  }, []);

  const columns = useMemo(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => {
              if (!el) return;
              el.indeterminate = table.getIsSomePageRowsSelected();
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="h-4 w-4 cursor-pointer rounded border-[var(--admin-border)] bg-[var(--admin-surface-input)]"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            className="h-4 w-4 cursor-pointer rounded border-[var(--admin-border)] bg-[var(--admin-surface-input)]"
          />
        ),
      },
      {
        accessorKey: "fullname",
        header: "User",
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-[var(--admin-text-primary)]">{row.original.fullname}</p>
            <p className="text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">{row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        enableSorting: false,
        cell: ({ getValue }) => <StatusBadge variant={getValue() === "admin" ? "info" : "neutral"}>{getValue()}</StatusBadge>,
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => {
          const status = statusFor(row.original);
          return <StatusBadge variant={status.variant}>{status.label}</StatusBadge>;
        },
      },
      {
        accessorKey: "owned_events_count",
        header: "Owned Events",
        enableSorting: false,
        meta: { align: "right" },
      },
      {
        accessorKey: "created_at",
        header: "Created At",
        enableSorting: false,
        cell: ({ getValue }) => formatAdminDateTime(getValue()),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => {
          const item = row.original;
          const rowBusy = busyRows.has(item.id) || isBusy;
          return (
            <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
              <button
                disabled={rowBusy}
                onClick={() => openEditModal(item.id)}
                className="rounded-lg p-1.5 text-[var(--admin-text-muted)] transition-colors hover:bg-[var(--admin-bg-card)] hover:text-[var(--admin-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>

              {item.is_disabled ? (
                <button
                  disabled={rowBusy}
                  onClick={() => executeEnable(item.id)}
                  className="rounded-lg p-1.5 text-[var(--admin-text-muted)] transition-colors hover:bg-[var(--admin-status-success-bg)] hover:text-[var(--admin-status-success)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">lock_open</span>
                </button>
              ) : (
                <button
                  disabled={rowBusy}
                  onClick={() =>
                    setConfirmAction({
                      type: "disable",
                      id: item.id,
                      title: "Disable user",
                      message: `Disable ${item.fullname}?`,
                    })
                  }
                  className="rounded-lg p-1.5 text-[var(--admin-text-muted)] transition-colors hover:bg-[var(--admin-status-warning-bg)] hover:text-[var(--admin-status-warning)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">lock</span>
                </button>
              )}

              <button
                disabled={rowBusy}
                onClick={() =>
                  setConfirmAction({
                    type: "delete",
                    id: item.id,
                    title: "Delete user",
                    message: `Delete ${item.fullname}? This action cannot be undone.`,
                  })
                }
                className="rounded-lg p-1.5 text-[var(--admin-text-muted)] transition-colors hover:bg-[var(--admin-status-error-bg)] hover:text-[var(--admin-status-error)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          );
        },
      },
    ],
    [busyRows, executeEnable, isBusy, openEditModal, statusFor],
  );

  const runConfirmAction = useCallback(async () => {
    if (!confirmAction) {
      return;
    }

    if (confirmAction.type === "delete") {
      await executeDelete(confirmAction.id);
      return;
    }

    if (confirmAction.type === "disable") {
      await executeDisable(confirmAction.id);
      return;
    }

    if (confirmAction.type === "bulk-disable") {
      await executeBulkDisable();
    }
  }, [confirmAction, executeBulkDisable, executeDelete, executeDisable]);

  return (
    <AdminPage>
      <PageHeader
        title="Users"
        subtitle={`Manage ${pagination.total} platform users`}
        action={
          <AdminButton
            variant="primary"
            icon={<span className="material-symbols-outlined text-base">person_add</span>}
            iconPosition="left"
            onClick={openCreateModal}
          >
            Add User
          </AdminButton>
        }
      />

      <PageContent>
        {feedback ? <div className="mb-4 rounded-lg border border-[var(--admin-status-success-border)] bg-[var(--admin-status-success-bg)] px-4 py-3 text-[var(--admin-text-small)] text-[var(--admin-status-success)]">{feedback}</div> : null}
        {mutationError ? <div className="mb-4 rounded-lg border border-[var(--admin-status-error-border)] bg-[var(--admin-status-error-bg)] px-4 py-3 text-[var(--admin-text-small)] text-[var(--admin-status-error)]">{mutationError}</div> : null}

        <ToolbarRow>
          <AdminInput
            placeholder="Search users..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            icon={<span className="material-symbols-outlined text-lg">search</span>}
            className="w-full lg:max-w-sm xl:max-w-md lg:flex-1"
          />
          <AdminSelect
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              grid.setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="w-full lg:w-44 xl:w-48"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </AdminSelect>
          <AdminSelect
            value={disabledFilter}
            onChange={(event) => {
              setDisabledFilter(event.target.value);
              grid.setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="w-full lg:w-44 xl:w-48"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </AdminSelect>

          {selectedIds.length > 0 ? (
            <>
              <AdminButton
                variant="secondary"
                icon={<span className="material-symbols-outlined text-base">lock_open</span>}
                iconPosition="left"
                disabled={isBusy}
                onClick={() => executeBulkEnable().catch(() => {})}
              >
                Bulk Enable ({selectedIds.length})
              </AdminButton>

              <AdminButton
                variant="danger"
                icon={<span className="material-symbols-outlined text-base">lock</span>}
                iconPosition="left"
                disabled={isBusy}
                onClick={() =>
                  setConfirmAction({
                    type: "bulk-disable",
                    title: "Bulk disable users",
                    message: `Disable ${selectedIds.length} selected users?`,
                  })
                }
              >
                Bulk Disable ({selectedIds.length})
              </AdminButton>
            </>
          ) : null}
        </ToolbarRow>

        <div className="admin-card-elevated overflow-hidden">
          {usersQuery.isError ? <ErrorState message={usersQuery.error?.message || "Failed to load users."} onRetry={() => usersQuery.refetch()} /> : null}

          {!usersQuery.isError && users.length === 0 && !usersQuery.isPending ? (
            <EmptyState icon="group_off" title="No users found" description="Try changing filters or search query." />
          ) : null}

          {!usersQuery.isError && (users.length > 0 || usersQuery.isPending) ? (
            <>
              <DataGrid
                columns={columns}
                data={users}
                getRowId={(row) => String(row.id)}
                pageCount={Math.max(1, pagination.totalPages || 1)}
                state={{
                  pagination: grid.pagination,
                  sorting: grid.sorting,
                  rowSelection: grid.rowSelection,
                }}
                onPaginationChange={grid.setPagination}
                onSortingChange={grid.setSorting}
                onRowSelectionChange={grid.setRowSelection}
                enableRowSelection
                isInitialLoading={usersQuery.isPending && !usersQuery.data}
                isRefreshing={usersQuery.isFetching && !usersQuery.isPending}
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

      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === "create" ? "Create user" : "Edit user"}
        footer={
          <>
            <AdminButton variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isBusy}>
              Cancel
            </AdminButton>
            <AdminButton variant="primary" onClick={() => submitModal().catch(() => {})} loading={isBusy}>
              {modalMode === "create" ? "Create" : "Save"}
            </AdminButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <AdminInput
            label="Full name"
            value={formState.fullname}
            onChange={(event) => setFormState((prev) => ({ ...prev, fullname: event.target.value }))}
          />
          {modalMode === "create" ? (
            <AdminInput
              label="Email"
              type="email"
              value={formState.email}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
            />
          ) : null}
          {modalMode === "create" ? (
            <AdminInput
              label="Password"
              type="password"
              value={formState.password}
              onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
            />
          ) : null}
          <AdminSelect
            label="Role"
            value={formState.role}
            onChange={(event) => setFormState((prev) => ({ ...prev, role: event.target.value }))}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </AdminSelect>
        </div>
      </AdminModal>

      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => runConfirmAction().catch(() => {})}
        title={confirmAction?.title || "Confirm"}
        message={confirmAction?.message || "Are you sure?"}
        confirmText={confirmAction?.type === "delete" ? "Delete" : "Confirm"}
        variant={confirmAction?.type === "delete" || confirmAction?.type === "bulk-disable" ? "danger" : "primary"}
        loading={isBusy}
      />
    </AdminPage>
  );
}
