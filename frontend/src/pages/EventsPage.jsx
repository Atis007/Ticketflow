import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { Link } from "react-router-dom";

import EventCard from "@/events/EventCard";
import SidebarMenu from "@/components/SidebarMenu";
import AsyncState from "@/components/AsyncState";
import { useCategories } from "@/categories/useCategories";
import { useEvents } from "@/events/hooks/useEvents";

export default function EventsPage() {
  const { categorySlug } = useParams();
  const { categories } = useCategories();
  const eventsQuery = useEvents(categorySlug);

  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const headingCategory = useMemo(() => {
    if (!categorySlug) return "Browse All";
    const match = categories?.find((cat) => cat.slug === categorySlug);
    return match ? match.name : categorySlug.replace(/-/g, " ");
  }, [categorySlug, categories]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    const source = eventsQuery.events;

    return source.filter((event) => {
      const matchesQuery = normalizedQuery
        ? event.title.toLowerCase().includes(normalizedQuery) ||
          event.location.toLowerCase().includes(normalizedQuery)
        : true;

      return matchesQuery;
    });
  }, [eventsQuery.events, searchTerm]);

  const capitalizedCategory = headingCategory
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const categoryPills = useMemo(() => {
    const mapped = categories?.map((category) => ({
      label: category.name,
      slug: category.slug,
    })) ?? [];

    return [{ label: "All", slug: null }, ...mapped];
  }, [categories]);

  const showEmptyState = !eventsQuery.isPending && !eventsQuery.isError && filteredEvents.length === 0;

  return (
    <>
      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="relative min-h-screen pt-6 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[520px] w-full max-w-6xl opacity-15 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="mb-10">
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
              <span className="font-medium">Events</span>
              <span className="text-text-muted-strong">/</span>
              <span className="font-semibold text-primary">{capitalizedCategory}</span>
            </div>
            <h1 className="mt-4 text-3xl md:text-5xl font-display tracking-tight text-white">
              Discover{" "}
              <span className="bg-gradient-to-r from-accent-cyan to-primary bg-clip-text text-transparent">
                Events
              </span>
            </h1>
            <p className="mt-3 text-text-muted max-w-2xl">
              Browse upcoming experiences across cinema, performing arts, and street food. Find what excites you next.
            </p>
          </div>

          <div className="mb-8 space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative max-w-xl w-full">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">search</span>
                <input
                  type="text"
                  placeholder="Search events, venues..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-mid py-3 pl-12 pr-4 text-white placeholder:text-text-muted focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30 transition-colors"
                />
              </div>
              <button
                onClick={() => setSidebarOpen(true)}
                className="inline-flex lg:hidden items-center gap-2 rounded-full border border-border bg-surface-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-primary/50 hover:text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">menu_open</span>
                Categories
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {categoryPills.map((pill) => {
                const isActive = (pill.slug ?? null) === (categorySlug ?? null);
                const href = pill.slug ? `/events/${pill.slug}` : "/events";

                return (
                  <Link
                    key={pill.slug ?? "all"}
                    to={href}
                    className={`px-4 py-2 rounded-full text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-white shadow-[0_0_16px_rgba(var(--color-primary-rgb),0.4)]"
                        : "bg-surface-mid border border-border text-text-muted hover:text-white hover:border-primary/50"
                    }`}
                  >
                    {pill.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {eventsQuery.isPending && !eventsQuery.data ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={`event-skeleton-${index}`}
                  className="animate-pulse rounded-2xl border border-border bg-surface-dark overflow-hidden"
                >
                  <div className="h-48 bg-surface-mid" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-surface-mid rounded w-1/3" />
                    <div className="h-6 bg-surface-mid rounded w-3/4" />
                    <div className="h-4 bg-surface-mid rounded w-full" />
                    <div className="flex justify-between">
                      <div className="h-4 bg-surface-mid rounded w-1/4" />
                      <div className="h-4 bg-surface-mid rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {eventsQuery.isError ? (
            <AsyncState
              type="error"
              className="max-w-3xl"
              message={eventsQuery.error?.message || "Failed to load events."}
              onRetry={() => eventsQuery.refetch()}
            />
          ) : null}

          {!eventsQuery.isPending && !eventsQuery.isError ? (
            <>
              {showEmptyState ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 rounded-full bg-surface-mid border border-border flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-3xl text-text-muted">search</span>
                  </div>
                  <h3 className="text-xl mb-2 text-white">No events found</h3>
                  <p className="text-text-muted max-w-md">
                    Try adjusting your search or filters to find what you're looking for.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </>
          ) : null}

          {eventsQuery.hasNextPage ? (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => eventsQuery.fetchNextPage()}
                disabled={eventsQuery.isFetchingNextPage}
                className="flex items-center gap-2 rounded-full border border-border bg-surface-dark px-6 py-3 text-sm font-bold text-white transition-all hover:border-primary/40 hover:text-primary disabled:opacity-60"
              >
                {eventsQuery.isFetchingNextPage ? "Loading..." : "Load More Events"}
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
