import { Link } from "react-router-dom";

function PlaceholderImage({ title }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/30 via-surface-ink to-accent-cyan/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(var(--color-accent-cyan-rgb),0.18),_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(var(--color-primary-rgb),0.25),_transparent_60%)]" />
      <div className="relative z-10 flex flex-col items-center gap-3 text-center px-6">
        <span className="material-symbols-outlined text-4xl text-white/80">event</span>
        <span className="text-sm font-semibold text-white/80 line-clamp-2">{title}</span>
      </div>
    </div>
  );
}

export default function EventCard({ event }) {
  const imageUrl = event.image || "";
  const categorySlug = event.categorySlug || "";
  const eventSlug = event.slug || event.id;
  const eventHref = categorySlug && eventSlug ? `/events/${categorySlug}/${eventSlug}` : "/events";

  return (
    <Link
      to={eventHref}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface-dark transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.18)]"
    >
      <div className="relative h-48 w-full overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <PlaceholderImage title={event.title} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent opacity-70" />
        <span className="absolute bottom-3 left-3 rounded-full border border-primary/30 bg-primary/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {event.category}
        </span>
        <div className="absolute right-3 top-3 rounded-xl border border-white/10 bg-surface-dark/80 px-3 py-2 text-white backdrop-blur">
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {event.dateLabel.split(" ")[0]}
          </span>
          <span className="text-lg font-bold leading-none block">
            {event.dateLabel.split(" ")[1]}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-lg font-semibold text-white transition-colors group-hover:text-accent-cyan line-clamp-1">
          {event.title}
        </h3>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span className="material-symbols-outlined text-[16px] text-accent-cyan/70">location_on</span>
          <span className="truncate">{event.location}</span>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <div className="flex flex-col">
            <span className="text-xs text-text-muted">{event.tag}</span>
            <span className="text-lg font-semibold text-white">{event.priceLabel}</span>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-mid text-white transition-all group-hover:border-primary/50 group-hover:text-primary">
            <span className="material-symbols-outlined">arrow_forward</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
