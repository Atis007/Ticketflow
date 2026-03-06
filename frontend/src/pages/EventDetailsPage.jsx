import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import SidebarMenu from "@/components/SidebarMenu";
import AsyncState from "@/components/AsyncState";
import EventLineupGrid from "@/events/EventLineupGrid";
import EventTicketCard from "@/events/EventTicketCard";
import EventOrganizerCard from "@/events/EventOrganizerCard";
import EventRelatedGrid from "@/events/EventRelatedGrid";
import { useEventDetails } from "@/events/hooks/useEventDetails";

function DetailCard({ icon, label, value, subValue }) {
  return (
    <div className="bg-surface-dark border border-border rounded-xl p-4 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-surface-mid border border-border text-accent-cyan">{icon}</div>
      <div>
        <span className="text-xs text-text-muted block">{label}</span>
        <span className="text-white">{value}</span>
        {subValue ? <span className="text-xs text-text-muted block mt-0.5">{subValue}</span> : null}
      </div>
    </div>
  );
}

export default function EventDetailsPage() {
  const { categorySlug, eventSlug } = useParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const detailsQuery = useEventDetails(categorySlug, eventSlug);
  const event = detailsQuery.event;

  const tags = useMemo(() => {
    if (!event?.categoryBadges) {
      return [];
    }

    return event.categoryBadges.map((badge) => badge.label);
  }, [event]);

  if (detailsQuery.isPending && !event) {
    return (
      <div className="mx-auto mt-20 w-full max-w-5xl">
        <AsyncState message="Loading event details..." />
      </div>
    );
  }

  if (detailsQuery.isError) {
    return (
      <div className="mx-auto mt-20 w-full max-w-5xl">
        <AsyncState
          type="error"
          message={detailsQuery.error?.message || "Failed to load event details."}
          onRetry={() => detailsQuery.refetch()}
        />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto mt-20 w-full max-w-5xl">
        <AsyncState message="Event not found." />
      </div>
    );
  }

  return (
    <>
      <SidebarMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="relative min-h-screen pt-6 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[520px] w-full max-w-6xl opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 text-text-muted hover:text-accent-cyan transition-colors mb-6"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Events</span>
            </Link>
            <button
              className="inline-flex lg:hidden items-center gap-2 rounded-full border border-border bg-surface-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-primary/50 hover:text-primary"
              onClick={() => setMenuOpen(true)}
            >
              <span className="material-symbols-outlined text-[18px]">menu_open</span>
              Categories
            </button>
          </div>

          <div className="relative h-64 md:h-[420px] rounded-2xl overflow-hidden mb-8 border border-border">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-surface-ink to-accent-cyan/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/40 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(var(--color-accent-cyan-rgb),0.2),_transparent_55%)]" />

            <div className="absolute top-4 right-4 flex gap-2">
              <button
                type="button"
                className="p-3 rounded-full bg-background-dark/60 backdrop-blur-sm border border-white/10 hover:border-primary/50 transition-all"
                aria-label="Save event"
              >
                <span className="material-symbols-outlined text-white/70">star</span>
              </button>
              <button
                type="button"
                className="p-3 rounded-full bg-background-dark/60 backdrop-blur-sm border border-white/10 hover:border-accent-cyan/50 transition-all"
                aria-label="Share event"
              >
                <span className="material-symbols-outlined text-white/70">share</span>
              </button>
            </div>

            <div className="absolute bottom-6 left-6 right-6">
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm mb-3">
                {event.categoryBadges?.[0]?.label || "Event"}
              </span>
              <h1 className="text-2xl md:text-4xl font-display tracking-tight text-white drop-shadow-lg">
                {event.title}
              </h1>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <div className="bg-surface-dark border border-border rounded-xl p-6">
                <h2 className="text-xl mb-4 text-white font-display">About This Event</h2>
                <div className="text-text-muted leading-relaxed space-y-4">
                  {event.description.map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <DetailCard
                  icon={<span className="material-symbols-outlined text-[18px]">calendar_month</span>}
                  label="Date & Time"
                  value={event.dateTime}
                />
                <DetailCard
                  icon={<span className="material-symbols-outlined text-[18px]">location_on</span>}
                  label="Venue"
                  value={event.venue}
                  subValue={event.location}
                />
                <DetailCard
                  icon={<span className="material-symbols-outlined text-[18px]">category</span>}
                  label="Category"
                  value={event.categoryBadges?.[0]?.label || "Event"}
                />
                <DetailCard
                  icon={<span className="material-symbols-outlined text-[18px]">sell</span>}
                  label="Type"
                  value={event.categoryBadges?.[1]?.label || "General"}
                />
              </div>

              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-surface-mid border border-border text-text-muted hover:text-white hover:border-primary/40 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">sell</span>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="space-y-4">
                <h2 className="text-xl text-white font-display">Lineup</h2>
                <EventLineupGrid lineup={event.lineup} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="sticky top-24 flex flex-col gap-4">
                <EventTicketCard tickets={event.tickets} purchase={event.purchase} />
                <EventOrganizerCard />
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-surface-dark to-transparent my-16" />

          <EventRelatedGrid events={event.similar} />
        </div>
      </main>
    </>
  );
}
