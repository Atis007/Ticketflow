import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import SidebarMenu from "@/components/SidebarMenu";
import EventDetailsHero from "@/events/EventDetailsHero";
import EventLineupGrid from "@/events/EventLineupGrid";
import EventTabs from "@/events/EventTabs";
import EventTicketCard from "@/events/EventTicketCard";
import EventOrganizerCard from "@/events/EventOrganizerCard";
import EventRelatedGrid from "@/events/EventRelatedGrid";
import { getEventDetail } from "@/events/mockEventDetails";

export default function EventDetailsPage() {
  const { eventId } = useParams();
  const [menuOpen, setMenuOpen] = useState(false);

  const event = useMemo(() => {
    // If a real data source exists, replace this selection with an API call using `slug`.
    return getEventDetail(eventId);
  }, [eventId]);

  return (
    <>
      <SidebarMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="relative flex h-auto min-h-screen w-full flex-col">
        <div className="flex flex-col w-full">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
              <Link to="/" className="hover:text-white">Home</Link>
              <span>/</span>
              <Link to="/events" className="hover:text-white">Events</Link>
              <span>/</span>
              <span className="text-white">{event.title}</span>
            </div>
            <button
              className="inline-flex lg:hidden items-center gap-2 rounded-full border border-white/10 bg-surface-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-primary/50 hover:text-primary"
              onClick={() => setMenuOpen(true)}
            >
              <span className="material-symbols-outlined text-[18px]">menu_open</span>
              Categories
            </button>
          </div>

          <div className="flex flex-1 justify-center px-4 pb-12 md:px-10 lg:px-20">
            <div className="flex flex-col max-w-[1120px] flex-1 w-full">
              <EventDetailsHero event={event} />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
                <div className="lg:col-span-8 flex flex-col gap-8">
                  <EventTabs />

                  <section className="flex flex-col gap-4" id="overview">
                    <h2 className="text-white text-2xl font-bold leading-tight">About the Event</h2>
                    <div className="text-text-muted text-base font-normal leading-relaxed space-y-4">
                      {event.description.map((para, idx) => (
                        <p key={idx}>{para}</p>
                      ))}
                    </div>
                  </section>

                  <section className="flex flex-col gap-6 pt-4" id="lineup">
                    <h2 className="text-white text-2xl font-bold leading-tight">Artist Lineup</h2>
                    <EventLineupGrid lineup={event.lineup} />
                  </section>

                  <section className="flex flex-col gap-6 pt-4" id="venue">
                    <div className="flex justify-between items-end">
                      <div>
                        <h2 className="text-white text-2xl font-bold leading-tight">The Venue</h2>
                        <p className="text-text-muted mt-2">{event.location}</p>
                      </div>
                      <button className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
                        Get Directions <span className="material-symbols-outlined text-sm">arrow_outward</span>
                      </button>
                    </div>
                    <div className="w-full h-64 rounded-xl overflow-hidden relative group border border-white/5">
                      <img
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsYdfD8UgY6UNiguQEvrHq7HkHyCN2CHibyyvWvLoU2gu95pofqVUeQVwprqFooAzJF1N3zhyn9l_GtSJ3wybtID2t6EB3Ggxd4aYWnaCE89YZfM_Jnx1eUsx7dJi53ly14wMXKCHHsh9IfA4FU86JdHzOiJ1O2AxB0J-tWnsVkhkTVvtjAtv3VQem7VaYJvKPkBRJcI1nlVkvMZN-6jzwlQfSsn6XEkYGzWcgWCRHXTrNwRcZ99X90HpBCYNn6mJs05NyUTrozfHl"
                        alt="Map view of The Midnight Arena"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-background-dark/80 backdrop-blur-sm p-3 rounded-xl border border-primary/50 shadow-neon">
                          <span className="material-symbols-outlined text-primary text-3xl">location_on</span>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="lg:col-span-4 relative">
                  <div className="sticky top-28 flex flex-col gap-4">
                    <EventTicketCard tickets={event.tickets} />
                    <EventOrganizerCard />
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-surface-dark to-transparent my-16" />

              <EventRelatedGrid events={event.similar} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
