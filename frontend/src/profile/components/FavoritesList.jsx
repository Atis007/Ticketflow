import { Link } from "react-router-dom";

function formatDate(dateValue) {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return "Date TBA";
  }

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FavoritesList({ items = [] }) {
  if (items.length === 0) {
    return <p className="text-sm text-text-soft">No favorite events yet.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article key={item.id} className="overflow-hidden rounded-xl border border-white/10 bg-background-dark/60">
          <div className="h-36 w-full">
            <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
          </div>
          <div className="space-y-2 p-4">
            <h3 className="text-base font-bold text-white">{item.title}</h3>
            <p className="text-xs text-text-soft">{formatDate(item.date)}</p>
            <p className="text-xs text-text-soft">{item.location}</p>
            <Link to={item.eventPath || "/events"} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-accent-cyan">
              View Event
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
