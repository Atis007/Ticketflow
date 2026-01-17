import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

import EventCard from "@/events/EventCard";
import EventFilters from "@/events/EventFilters";
import EventHero from "@/events/EventHero";
import SidebarMenu from "@/components/SidebarMenu";
import { events, heroFeature } from "@/events/mockEvents";
import { useCategories } from "@/categories/CategoryContext";

export default function EventsPage() {
  const { category: categorySlug } = useParams();
  const { categories } = useCategories();

  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const headingCategory = useMemo(() => {
    if (!categorySlug) return "Browse All";
    const match = categories?.find((cat) => cat.slug === categorySlug);
    return match ? match.name : categorySlug.replace(/-/g, " ");
  }, [categorySlug, categories]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return events.filter((event) => {
      const matchesCategory = categorySlug
        ? event.categorySlug === categorySlug
        : true;
      const matchesQuery = normalizedQuery
        ? event.title.toLowerCase().includes(normalizedQuery) ||
          event.location.toLowerCase().includes(normalizedQuery)
        : true;

      return matchesCategory && matchesQuery;
    });
  }, [categorySlug, searchTerm]);

  const capitalizedCategory = headingCategory
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return (
    <>
      <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 flex flex-col">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-400">
              <span className="font-medium">Events</span>
              <span className="text-gray-600">/</span>
              <span className="font-semibold text-primary">
                {capitalizedCategory}
              </span>
            </div>

            <EventHero feature={heroFeature} />

            <EventFilters
              searchTerm={searchTerm}
              onSearch={setSearchTerm}
              onOpenCategories={() => setSidebarOpen(true)}
            />

            <section className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-widest text-gray-500">
                    Upcoming
                  </p>
                  <h2 className="text-2xl font-bold text-white">
                    {capitalizedCategory}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {filteredEvents.length} events found
                  </p>
                </div>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="inline-flex lg:hidden items-center gap-2 rounded-full border border-white/10 bg-surface-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    menu_open
                  </span>
                  Categories
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>

              <div className="mt-2 flex justify-center">
                <button className="flex items-center gap-2 rounded-full border border-white/10 bg-surface-dark px-6 py-3 text-sm font-bold text-white transition-all hover:border-primary/40 hover:text-primary">
                  Load More Events
                  <span className="material-symbols-outlined text-sm">
                    expand_more
                  </span>
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
