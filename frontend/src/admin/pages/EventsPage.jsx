import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/auth/context/AuthContext";
import { adminQueryKeys, createEvent, getAdminCategories, getAdminEvents, toggleEventActive, updateEventPatch } from "../api";
import { formatAdminDateTime } from "../utils/dateTime";
import {
  AdminButton,
  AdminInput,
  AdminModal,
  AdminPage,
  AdminSelect,
  AdminTextarea,
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
import VenueLayoutGenerator from "../components/VenueLayoutGenerator";

function toDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const normalized = String(value).replace(" ", "T");
  return normalized.slice(0, 16);
}

function initialEventForm() {
  return {
    title: "",
    slug: "",
    categoryId: "",
    subcategoryId: "",
    description: "",
    city: "",
    venue: "",
    startsAt: "",
    endsAt: "",
    capacity: "",
    isFree: "false",
    price: "",
    isSeated: "false",
    isActive: "true",
  };
}

function validateEventForm({ form, mode }) {
  const errors = {};

  if (!String(form.title || "").trim()) {
    errors.title = "Title is required";
  }

  if (mode === "create" && !form.categoryId) {
    errors.categoryId = "Category is required";
  }

  if (mode === "create" && !form.subcategoryId) {
    errors.subcategoryId = "Subcategory is required";
  }

  if (!String(form.startsAt || "").trim()) {
    errors.startsAt = "Start datetime is required";
  }

  if (form.startsAt && form.endsAt) {
    const start = new Date(form.startsAt);
    const end = new Date(form.endsAt);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
      errors.endsAt = "End datetime must be later than start";
    }
  }

  const isFree = form.isFree === "true";
  if (!isFree) {
    const price = Number(form.price);
    if (!form.price || Number.isNaN(price) || price <= 0) {
      errors.price = "Paid events must have price greater than 0";
    }
  }

  if (form.capacity) {
    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      errors.capacity = "Capacity must be an integer greater than 0";
    }
  }

  return errors;
}

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
  const [eventModal, setEventModal] = useState({ open: false, mode: "create", id: null });
  const [eventForm, setEventForm] = useState(() => initialEventForm());
  const [eventFormErrors, setEventFormErrors] = useState({});
  const [layoutModal, setLayoutModal] = useState({ open: false, event: null });

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

  const createEventMutation = useMutation({
    mutationFn: async (payload) => createEvent({ token, payload }),
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, payload }) => updateEventPatch({ token, id, payload }),
  });

  const modalBusy = createEventMutation.isPending || updateEventMutation.isPending;

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

  const resetEventModal = useCallback(() => {
    setEventModal({ open: false, mode: "create", id: null });
    setEventForm(initialEventForm());
    setEventFormErrors({});
  }, []);

  const openCreateEventModal = useCallback(() => {
    setMutationError(null);
    setFeedback(null);
    setEventForm(initialEventForm());
    setEventFormErrors({});
    setEventModal({ open: true, mode: "create", id: null });
  }, []);

  const openEditEventModal = useCallback((row) => {
    setMutationError(null);
    setFeedback(null);
    setEventFormErrors({});
    setEventForm({
      ...initialEventForm(),
      title: row.title || "",
      city: row.city || "",
      venue: row.venue || "",
      startsAt: toDateTimeLocal(row.starts_at),
      isFree: row.is_free ? "true" : "false",
      price: row.price ?? "",
      isActive: row.is_active ? "true" : "false",
    });
    setEventModal({ open: true, mode: "edit", id: row.id });
  }, []);

  const submitEventForm = useCallback(async () => {
    if (!token) {
      return;
    }

    setMutationError(null);
    setFeedback(null);

    const errors = validateEventForm({ form: eventForm, mode: eventModal.mode });
    setEventFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const isFree = eventForm.isFree === "true";
    const payload = {
      title: eventForm.title.trim(),
      startsAt: eventForm.startsAt,
      isFree,
      isSeated: eventForm.isSeated === "true",
      isActive: eventForm.isActive === "true",
    };

    if (eventForm.slug.trim()) {
      payload.slug = eventForm.slug.trim();
    }

    if (eventForm.description.trim()) {
      payload.description = eventForm.description.trim();
    }

    if (eventForm.city.trim()) {
      payload.city = eventForm.city.trim();
    }

    if (eventForm.venue.trim()) {
      payload.venue = eventForm.venue.trim();
    }

    if (eventForm.endsAt.trim()) {
      payload.endsAt = eventForm.endsAt;
    }

    if (eventForm.capacity) {
      payload.capacity = Number(eventForm.capacity);
    }

    if (eventModal.mode === "create") {
      payload.categoryId = Number(eventForm.categoryId);
      payload.subcategoryId = Number(eventForm.subcategoryId);
    } else {
      if (eventForm.categoryId) {
        payload.categoryId = Number(eventForm.categoryId);
      }

      if (eventForm.subcategoryId) {
        payload.subcategoryId = Number(eventForm.subcategoryId);
      }
    }

    if (isFree) {
      payload.price = null;
    } else {
      payload.price = Number(eventForm.price);
    }

    try {
      if (eventModal.mode === "create") {
        await createEventMutation.mutateAsync(payload);
        setFeedback("Event created.");
      } else if (eventModal.id) {
        await updateEventMutation.mutateAsync({ id: eventModal.id, payload });
        setFeedback("Event updated.");
      }

      resetEventModal();
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.events.all });
    } catch (error) {
      setMutationError(error?.message || "Failed to save event.");
    }
  }, [createEventMutation, eventForm, eventModal.id, eventModal.mode, queryClient, resetEventModal, token, updateEventMutation]);

  const categories = Array.isArray(categoryQuery.data) ? categoryQuery.data : [];
  const selectedCategory = categories.find((item) => String(item.id) === eventForm.categoryId) || null;
  const availableSubcategories = selectedCategory?.subcategories || [];
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
          <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
            {row.original.is_seated && (
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => setLayoutModal({ open: true, event: row.original })}
                icon={<span className="material-symbols-outlined text-base">grid_view</span>}
                iconPosition="left"
              >
                Layout
              </AdminButton>
            )}
            <AdminButton
              variant="ghost"
              size="sm"
              onClick={() => openEditEventModal(row.original)}
              icon={<span className="material-symbols-outlined text-base">edit</span>}
              iconPosition="left"
            >
              Edit
            </AdminButton>
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
    [busyRows, handleToggleActive, openEditEventModal],
  );

  return (
    <AdminPage>
      <PageHeader
        title="Events"
        subtitle={`Moderate ${pagination.total} events`}
        action={
          <AdminButton
            variant="primary"
            icon={<span className="material-symbols-outlined text-base">add</span>}
            iconPosition="left"
            onClick={openCreateEventModal}
          >
            Add Event
          </AdminButton>
        }
      />

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

      <AdminModal
        isOpen={eventModal.open}
        onClose={resetEventModal}
        title={eventModal.mode === "create" ? "Create Event" : "Edit Event"}
        size="lg"
        footer={
          <>
            <AdminButton variant="ghost" onClick={resetEventModal} disabled={modalBusy}>
              Cancel
            </AdminButton>
            <AdminButton variant="primary" onClick={() => submitEventForm().catch(() => {})} loading={modalBusy}>
              {eventModal.mode === "create" ? "Create" : "Save"}
            </AdminButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AdminInput
            label="Title"
            value={eventForm.title}
            onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))}
            error={eventFormErrors.title}
          />
          <AdminInput
            label="Slug"
            value={eventForm.slug}
            onChange={(event) => setEventForm((prev) => ({ ...prev, slug: event.target.value }))}
            helperText="Optional"
          />

          <AdminSelect
            label="Category"
            value={eventForm.categoryId}
            onChange={(event) =>
              setEventForm((prev) => ({
                ...prev,
                categoryId: event.target.value,
                subcategoryId: "",
              }))
            }
            error={eventFormErrors.categoryId}
          >
            <option value="">Select category</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </AdminSelect>

          <AdminSelect
            label="Subcategory"
            value={eventForm.subcategoryId}
            onChange={(event) => setEventForm((prev) => ({ ...prev, subcategoryId: event.target.value }))}
            error={eventFormErrors.subcategoryId}
          >
            <option value="">Select subcategory</option>
            {availableSubcategories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </AdminSelect>

          <AdminInput
            label="City"
            value={eventForm.city}
            onChange={(event) => setEventForm((prev) => ({ ...prev, city: event.target.value }))}
          />

          <AdminInput
            label="Venue"
            value={eventForm.venue}
            onChange={(event) => setEventForm((prev) => ({ ...prev, venue: event.target.value }))}
          />

          <AdminInput
            label="Starts At"
            type="datetime-local"
            value={eventForm.startsAt}
            onChange={(event) => setEventForm((prev) => ({ ...prev, startsAt: event.target.value }))}
            error={eventFormErrors.startsAt}
          />

          <AdminInput
            label="Ends At"
            type="datetime-local"
            value={eventForm.endsAt}
            onChange={(event) => setEventForm((prev) => ({ ...prev, endsAt: event.target.value }))}
            error={eventFormErrors.endsAt}
          />

          <AdminSelect
            label="Is Free"
            value={eventForm.isFree}
            onChange={(event) =>
              setEventForm((prev) => ({
                ...prev,
                isFree: event.target.value,
                price: event.target.value === "true" ? "" : prev.price,
              }))
            }
          >
            <option value="false">Paid</option>
            <option value="true">Free</option>
          </AdminSelect>

          <AdminInput
            label="Price"
            type="number"
            step="0.01"
            min="0"
            value={eventForm.price}
            onChange={(event) => setEventForm((prev) => ({ ...prev, price: event.target.value }))}
            disabled={eventForm.isFree === "true"}
            error={eventFormErrors.price}
          />

          <AdminInput
            label="Capacity"
            type="number"
            min="1"
            value={eventForm.capacity}
            onChange={(event) => setEventForm((prev) => ({ ...prev, capacity: event.target.value }))}
            error={eventFormErrors.capacity}
          />

          <AdminSelect
            label="Seated"
            value={eventForm.isSeated}
            onChange={(event) => setEventForm((prev) => ({ ...prev, isSeated: event.target.value }))}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </AdminSelect>

          <AdminSelect
            label="Active"
            value={eventForm.isActive}
            onChange={(event) => setEventForm((prev) => ({ ...prev, isActive: event.target.value }))}
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </AdminSelect>

          <div className="md:col-span-2">
            <AdminTextarea
              label="Description"
              rows={5}
              value={eventForm.description}
              onChange={(event) => setEventForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
        </div>
      </AdminModal>

      <AdminModal
        isOpen={layoutModal.open}
        onClose={() => setLayoutModal({ open: false, event: null })}
        title={`Generate Layout — ${layoutModal.event?.title || ""}`}
        size="lg"
      >
        {layoutModal.event && (
          <VenueLayoutGenerator
            eventId={layoutModal.event.id}
            eventVenue={layoutModal.event.venue}
            eventCapacity={layoutModal.event.capacity}
            onGenerated={() => setLayoutModal({ open: false, event: null })}
          />
        )}
      </AdminModal>
    </AdminPage>
  );
}
