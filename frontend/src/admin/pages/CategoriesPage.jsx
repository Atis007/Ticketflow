import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/auth/context/AuthContext";
import {
  adminQueryKeys,
  createCategory,
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  getAdminCategories,
  updateCategory,
  updateSubcategory,
} from "../api";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminModal,
  AdminPage,
  AdminSelect,
  ConfirmDialog,
  DataGrid,
  EmptyState,
  ErrorState,
  PageContent,
  PageHeader,
  StatusBadge,
  ToolbarRow,
} from "../components";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function initialCategoryForm() {
  return {
    name: "",
    icon: "category",
    slug: "",
  };
}

function initialSubcategoryForm() {
  return {
    categoryId: "",
    name: "",
    slug: "",
  };
}

export default function CategoriesPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [mutationError, setMutationError] = useState(null);

  const [categoryModal, setCategoryModal] = useState({ open: false, mode: "create", id: null });
  const [subcategoryModal, setSubcategoryModal] = useState({ open: false, mode: "create", id: null });
  const [categoryForm, setCategoryForm] = useState(() => initialCategoryForm());
  const [subcategoryForm, setSubcategoryForm] = useState(() => initialSubcategoryForm());

  const [confirmAction, setConfirmAction] = useState(null);

  const categoriesQuery = useQuery({
    queryKey: adminQueryKeys.categories.list(),
    enabled: Boolean(token),
    queryFn: ({ signal }) => getAdminCategories({ token, signal }),
    placeholderData: (previous) => previous,
  });

  const categories = useMemo(
    () => (Array.isArray(categoriesQuery.data) ? categoriesQuery.data : []),
    [categoriesQuery.data],
  );

  const activeCategoryId = selectedCategoryId ?? categories[0]?.id ?? null;
  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === activeCategoryId) || null,
    [activeCategoryId, categories],
  );

  const categoryRows = useMemo(
    () =>
      categories.map((item) => ({
        ...item,
        subcategoryCount: item.subcategories?.length || 0,
      })),
    [categories],
  );

  const totalSubcategories = useMemo(
    () => categories.reduce((sum, item) => sum + (item.subcategories?.length || 0), 0),
    [categories],
  );

  const invalidateCategories = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: adminQueryKeys.categories.all });
  }, [queryClient]);

  const createCategoryMutation = useMutation({
    mutationFn: async (payload) => createCategory({ token, payload }),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, payload }) => updateCategory({ token, id, payload }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id) => deleteCategory({ token, id }),
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: async (payload) => createSubcategory({ token, payload }),
  });

  const updateSubcategoryMutation = useMutation({
    mutationFn: async ({ id, payload }) => updateSubcategory({ token, id, payload }),
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: async (id) => deleteSubcategory({ token, id }),
  });

  const isBusy =
    createCategoryMutation.isPending ||
    updateCategoryMutation.isPending ||
    deleteCategoryMutation.isPending ||
    createSubcategoryMutation.isPending ||
    updateSubcategoryMutation.isPending ||
    deleteSubcategoryMutation.isPending;

  const clearMessages = useCallback(() => {
    setFeedback(null);
    setMutationError(null);
  }, []);

  const submitCategory = useCallback(async () => {
    clearMessages();

    const payload = {
      name: categoryForm.name,
      icon: categoryForm.icon,
      slug: categoryForm.slug || slugify(categoryForm.name),
    };

    try {
      if (categoryModal.mode === "create") {
        await createCategoryMutation.mutateAsync(payload);
        setFeedback("Category created.");
      } else if (categoryModal.id) {
        await updateCategoryMutation.mutateAsync({ id: categoryModal.id, payload });
        setFeedback("Category updated.");
      }

      setCategoryModal({ open: false, mode: "create", id: null });
      setCategoryForm(initialCategoryForm());
      await invalidateCategories();
    } catch (error) {
      setMutationError(error?.message || "Failed to save category.");
    }
  }, [categoryForm, categoryModal.id, categoryModal.mode, clearMessages, createCategoryMutation, invalidateCategories, updateCategoryMutation]);

  const submitSubcategory = useCallback(async () => {
    clearMessages();

    const payload = {
      categoryId: Number(subcategoryForm.categoryId),
      name: subcategoryForm.name,
      slug: subcategoryForm.slug || slugify(subcategoryForm.name),
    };

    try {
      if (subcategoryModal.mode === "create") {
        await createSubcategoryMutation.mutateAsync(payload);
        setFeedback("Subcategory created.");
      } else if (subcategoryModal.id) {
        await updateSubcategoryMutation.mutateAsync({ id: subcategoryModal.id, payload });
        setFeedback("Subcategory updated.");
      }

      setSubcategoryModal({ open: false, mode: "create", id: null });
      setSubcategoryForm(initialSubcategoryForm());
      await invalidateCategories();
    } catch (error) {
      setMutationError(error?.message || "Failed to save subcategory.");
    }
  }, [clearMessages, createSubcategoryMutation, invalidateCategories, subcategoryForm, subcategoryModal.id, subcategoryModal.mode, updateSubcategoryMutation]);

  const runConfirmAction = useCallback(async () => {
    if (!confirmAction) {
      return;
    }

    clearMessages();

    try {
      if (confirmAction.type === "delete-category") {
        await deleteCategoryMutation.mutateAsync(confirmAction.id);
        setFeedback("Category deleted.");
      }

      if (confirmAction.type === "delete-subcategory") {
        await deleteSubcategoryMutation.mutateAsync(confirmAction.id);
        setFeedback("Subcategory deleted.");
      }

      setConfirmAction(null);
      await invalidateCategories();
    } catch (error) {
      setMutationError(error?.message || "Delete failed.");
    }
  }, [clearMessages, confirmAction, deleteCategoryMutation, deleteSubcategoryMutation, invalidateCategories]);

  const categoryColumns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Category",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--admin-surface-input)]">
              <span className="material-symbols-outlined text-lg text-[var(--admin-interactive-primary)]">{row.original.icon || "category"}</span>
            </div>
            <div>
              <p className="font-medium text-[var(--admin-text-primary)]">{row.original.name}</p>
              <p className="text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">{row.original.slug}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "subcategoryCount",
        header: "Subcategories",
        enableSorting: false,
        meta: { align: "right" },
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        cell: () => <StatusBadge variant="success">Active</StatusBadge>,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
            <button
              onClick={() => {
                setCategoryModal({ open: true, mode: "edit", id: row.original.id });
                setCategoryForm({
                  name: row.original.name,
                  icon: row.original.icon || "category",
                  slug: row.original.slug,
                });
              }}
              className="rounded-lg p-1.5 text-[var(--admin-text-muted)] transition-colors hover:bg-[var(--admin-bg-card)] hover:text-[var(--admin-text-primary)]"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </button>
            <button
              onClick={() => {
                setSubcategoryModal({ open: true, mode: "create", id: null });
                setSubcategoryForm({
                  categoryId: String(row.original.id),
                  name: "",
                  slug: "",
                });
              }}
              className="rounded-lg p-1.5 text-[var(--admin-text-muted)] transition-colors hover:bg-[var(--admin-status-info-bg)] hover:text-[var(--admin-status-info)]"
            >
              <span className="material-symbols-outlined text-lg">playlist_add</span>
            </button>
            <button
              onClick={() =>
                setConfirmAction({
                  type: "delete-category",
                  id: row.original.id,
                  title: "Delete category",
                  message: `Delete ${row.original.name}?`,
                })
              }
              className="rounded-lg p-1.5 text-[var(--admin-text-muted)] transition-colors hover:bg-[var(--admin-status-error-bg)] hover:text-[var(--admin-status-error)]"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const subcategoryColumns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Subcategory",
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-[var(--admin-text-primary)]">{row.original.name}</p>
            <p className="text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">{row.original.slug}</p>
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
            <button
              onClick={() => {
                setSubcategoryModal({ open: true, mode: "edit", id: row.original.id });
                setSubcategoryForm({
                  categoryId: String(selectedCategory?.id || ""),
                  name: row.original.name,
                  slug: row.original.slug,
                });
              }}
              className="rounded-lg p-1.5 text-[var(--admin-text-muted)] transition-colors hover:bg-[var(--admin-bg-card)] hover:text-[var(--admin-text-primary)]"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </button>
            <button
              onClick={() =>
                setConfirmAction({
                  type: "delete-subcategory",
                  id: row.original.id,
                  title: "Delete subcategory",
                  message: `Delete ${row.original.name}?`,
                })
              }
              className="rounded-lg p-1.5 text-[var(--admin-text-muted)] transition-colors hover:bg-[var(--admin-status-error-bg)] hover:text-[var(--admin-status-error)]"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        ),
      },
    ],
    [selectedCategory?.id],
  );

  return (
    <AdminPage>
      <PageHeader
        title="Categories"
        subtitle="Manage categories and subcategories"
        action={
          <AdminButton
            variant="primary"
            icon={<span className="material-symbols-outlined text-base">add</span>}
            iconPosition="left"
            onClick={() => {
              clearMessages();
              setCategoryModal({ open: true, mode: "create", id: null });
              setCategoryForm(initialCategoryForm());
            }}
          >
            Add Category
          </AdminButton>
        }
      />

      <PageContent>
        {feedback ? <div className="mb-4 rounded-lg border border-[var(--admin-status-success-border)] bg-[var(--admin-status-success-bg)] px-4 py-3 text-[var(--admin-text-small)] text-[var(--admin-status-success)]">{feedback}</div> : null}
        {mutationError ? <div className="mb-4 rounded-lg border border-[var(--admin-status-error-border)] bg-[var(--admin-status-error-bg)] px-4 py-3 text-[var(--admin-text-small)] text-[var(--admin-status-error)]">{mutationError}</div> : null}

        {categoriesQuery.isError ? <ErrorState message={categoriesQuery.error?.message || "Failed to load categories."} onRetry={() => categoriesQuery.refetch()} /> : null}

        {!categoriesQuery.isError && !categoriesQuery.isPending && categories.length === 0 ? (
          <EmptyState
            icon="category"
            title="No categories"
            description="Create the first category to begin."
            action={{
              label: "Add Category",
              onClick: () => {
                setCategoryModal({ open: true, mode: "create", id: null });
              },
            }}
          />
        ) : null}

        {!categoriesQuery.isError && (categories.length > 0 || categoriesQuery.isPending) ? (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3 xl:gap-6">
              <AdminCard>
                <p className="text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">Total Categories</p>
                <p className="mt-2 text-[var(--admin-text-title)] font-bold text-[var(--admin-text-primary)]">{categories.length}</p>
              </AdminCard>
              <AdminCard>
                <p className="text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">Total Subcategories</p>
                <p className="mt-2 text-[var(--admin-text-title)] font-bold text-[var(--admin-status-info)]">{totalSubcategories}</p>
              </AdminCard>
              <AdminCard>
                <p className="text-[var(--admin-text-caption)] text-[var(--admin-text-muted)]">Selected Category</p>
                <p className="mt-2 text-[var(--admin-text-title)] font-bold text-[var(--admin-text-primary)]">{selectedCategory?.name || "-"}</p>
              </AdminCard>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="admin-card-elevated overflow-hidden lg:col-span-7 xl:col-span-8">
                <DataGrid
                  columns={categoryColumns}
                  data={categoryRows}
                  getRowId={(row) => String(row.id)}
                  manualPagination={false}
                  manualSorting={false}
                  onRowClick={(row) => setSelectedCategoryId(row.id)}
                  isInitialLoading={categoriesQuery.isPending && !categoriesQuery.data}
                  isRefreshing={categoriesQuery.isFetching && !categoriesQuery.isPending}
                />
              </div>

              <div className="admin-card-elevated p-4 lg:col-span-5 xl:col-span-4">
                <ToolbarRow>
                  <p className="text-[var(--admin-text-small)] text-[var(--admin-text-secondary)]">Subcategories</p>
                  <AdminButton
                    variant="secondary"
                    size="sm"
                    icon={<span className="material-symbols-outlined text-base">add</span>}
                    iconPosition="left"
                    onClick={() => {
                      setSubcategoryModal({ open: true, mode: "create", id: null });
                      setSubcategoryForm({
                        categoryId: String(selectedCategory?.id || ""),
                        name: "",
                        slug: "",
                      });
                    }}
                    disabled={!selectedCategory}
                  >
                    Add
                  </AdminButton>
                </ToolbarRow>

                {selectedCategory ? (
                  <DataGrid
                    columns={subcategoryColumns}
                    data={selectedCategory.subcategories || []}
                    getRowId={(row) => String(row.id)}
                    manualPagination={false}
                    manualSorting={false}
                    emptyMessage="No subcategories yet"
                    isInitialLoading={categoriesQuery.isPending && !categoriesQuery.data}
                    isRefreshing={categoriesQuery.isFetching && !categoriesQuery.isPending}
                  />
                ) : (
                  <EmptyState icon="subdirectory_arrow_right" title="Select a category" description="Choose a category from the table to manage subcategories." />
                )}
              </div>
            </div>
          </>
        ) : null}
      </PageContent>

      <AdminModal
        isOpen={categoryModal.open}
        onClose={() => setCategoryModal({ open: false, mode: "create", id: null })}
        title={categoryModal.mode === "create" ? "Create Category" : "Edit Category"}
        footer={
          <>
            <AdminButton variant="ghost" onClick={() => setCategoryModal({ open: false, mode: "create", id: null })} disabled={isBusy}>
              Cancel
            </AdminButton>
            <AdminButton variant="primary" onClick={() => submitCategory().catch(() => {})} loading={isBusy}>
              {categoryModal.mode === "create" ? "Create" : "Save"}
            </AdminButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <AdminInput label="Name" value={categoryForm.name} onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))} />
          <AdminInput label="Icon" value={categoryForm.icon} onChange={(event) => setCategoryForm((prev) => ({ ...prev, icon: event.target.value }))} helperText="Material Symbols icon name" />
          <AdminInput
            label="Slug"
            value={categoryForm.slug}
            onChange={(event) => setCategoryForm((prev) => ({ ...prev, slug: event.target.value }))}
            helperText="Leave empty to auto-generate"
          />
        </div>
      </AdminModal>

      <AdminModal
        isOpen={subcategoryModal.open}
        onClose={() => setSubcategoryModal({ open: false, mode: "create", id: null })}
        title={subcategoryModal.mode === "create" ? "Create Subcategory" : "Edit Subcategory"}
        footer={
          <>
            <AdminButton variant="ghost" onClick={() => setSubcategoryModal({ open: false, mode: "create", id: null })} disabled={isBusy}>
              Cancel
            </AdminButton>
            <AdminButton variant="primary" onClick={() => submitSubcategory().catch(() => {})} loading={isBusy}>
              {subcategoryModal.mode === "create" ? "Create" : "Save"}
            </AdminButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <AdminSelect
            label="Category"
            value={subcategoryForm.categoryId}
            onChange={(event) => setSubcategoryForm((prev) => ({ ...prev, categoryId: event.target.value }))}
          >
            <option value="">Select category</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </AdminSelect>

          <AdminInput
            label="Name"
            value={subcategoryForm.name}
            onChange={(event) => setSubcategoryForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <AdminInput
            label="Slug"
            value={subcategoryForm.slug}
            onChange={(event) => setSubcategoryForm((prev) => ({ ...prev, slug: event.target.value }))}
            helperText="Leave empty to auto-generate"
          />
        </div>
      </AdminModal>

      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => runConfirmAction().catch(() => {})}
        title={confirmAction?.title || "Confirm"}
        message={confirmAction?.message || "Are you sure?"}
        confirmText="Delete"
        variant="danger"
        loading={isBusy}
      />
    </AdminPage>
  );
}
