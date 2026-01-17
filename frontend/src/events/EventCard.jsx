import { Link } from "react-router-dom";

export default function EventCard({ event }) {
  return (
    <Link
      to={`/events/${event.categorySlug}/${event.slug || event.id}`}
      className="group relative flex flex-col gap-4 rounded-3xl bg-surface-dark p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.18)] border border-white/5"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-background-dark/50">
        <img
          src={event.image}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute right-3 top-3 flex flex-col items-center justify-center rounded-xl bg-surface-dark/90 px-3 py-2 text-white backdrop-blur">
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {event.dateLabel.split(" ")[0]}
          </span>
          <span className="text-lg font-bold leading-none">
            {event.dateLabel.split(" ")[1]}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
          <span className="material-symbols-outlined text-[14px]">{event.icon}</span>
          <span>{event.category}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-2 pb-2">
        <h3 className="line-clamp-1 text-lg font-bold text-white transition-colors group-hover:text-primary">
          {event.title}
        </h3>
        <div className="flex items-center gap-1 text-gray-400">
          <span className="material-symbols-outlined text-[16px]">location_on</span>
          <span className="truncate text-sm">{event.location}</span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">{event.tag}</span>
            <span className="text-lg font-bold text-primary">{event.priceLabel}</span>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-dark text-white transition-all group-hover:bg-primary group-hover:text-background-dark border border-white/5">
            <span className="material-symbols-outlined">arrow_forward</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
