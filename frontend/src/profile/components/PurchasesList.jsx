const STATUS_STYLES = {
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  refunded: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

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

export default function PurchasesList({ items = [] }) {
  if (items.length === 0) {
    return <p className="text-sm text-text-soft">No purchases yet.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-xl border border-white/10 bg-background-dark/50 p-4">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base font-bold text-white">{item.eventName}</h3>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${STATUS_STYLES[item.status] || STATUS_STYLES.pending}`}>
              {item.status}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1 text-sm text-text-soft lg:grid-cols-3">
            <p className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">calendar_month</span>
              {formatDate(item.eventDate)}
            </p>
            <p className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">confirmation_number</span>
              {item.quantity} x {item.ticketType}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
