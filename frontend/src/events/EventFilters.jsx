import { useState } from "react";

const dateFilters = ["All Dates", "Today", "This Weekend", "New York"];

export default function EventFilters({ searchTerm, onSearch, onOpenCategories }) {
  const [activeFilter, setActiveFilter] = useState(dateFilters[0]);

  return (
    <div className="sticky top-6 z-20 mb-8 -mx-2 px-2 md:mx-0 md:px-0">
      <div className="flex flex-col gap-4 rounded-3xl bg-surface-dark/90 p-2 backdrop-blur-xl border border-white/5 md:flex-row md:items-center md:p-3 shadow-lg shadow-background-dark/40">
        <div className="flex-1 min-w-0">
          <label className="relative flex h-12 w-full items-center overflow-hidden rounded-2xl bg-background-dark/60 border border-white/10 px-3">
            <span className="material-symbols-outlined text-gray-400 mr-2">search</span>
            <input
              value={searchTerm}
              onChange={(e) => onSearch?.(e.target.value)}
              className="h-full w-full border-none bg-transparent text-base text-white placeholder-gray-500 focus:ring-0"
              placeholder="Search events, artists, or venues..."
              aria-label="Search events"
            />
          </label>
        </div>

        <div className="hidden h-8 w-px bg-white/10 md:block" aria-hidden="true" />

        <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {dateFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors
                ${
                  activeFilter === filter
                    ? "border-primary bg-primary text-background-dark"
                    : "border-white/10 bg-surface-dark text-white hover:border-primary/40 hover:text-primary"
                }
              `}
            >
              {filter === "New York" && (
                <span className="material-symbols-outlined text-[18px]">location_on</span>
              )}
              {filter}
            </button>
          ))}
          <button
            onClick={onOpenCategories}
            className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-surface-dark px-4 text-sm font-semibold text-white transition-colors hover:border-primary/50 hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Filters
          </button>
        </div>
      </div>
    </div>
  );
}
