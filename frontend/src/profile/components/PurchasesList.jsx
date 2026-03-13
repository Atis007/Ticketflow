import { useState } from "react";

import { formatEventDate } from "@/utils/formatDate";
import TicketQR from "@/purchases/TicketQR";

const STATUS_STYLES = {
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  refunded: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

function formatAmount(amount, currency) {
  if (amount == null) return null;
  const num = Number(amount);
  if (!Number.isFinite(num)) return null;
  return `${num.toFixed(2)} ${currency || "RSD"}`;
}

function TicketQRList({ tickets }) {
  const [expanded, setExpanded] = useState(false);

  if (!tickets || tickets.length === 0) return null;

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="inline-flex items-center gap-1 text-xs font-medium text-text-muted hover:text-white transition-colors"
      >
        <span className="material-symbols-outlined text-sm">
          {expanded ? "expand_less" : "expand_more"}
        </span>
        {expanded ? "Hide" : "Show"} {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
      </button>

      {expanded && (
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tickets.map((ticket, idx) => (
            <TicketQR
              key={ticket.id || idx}
              qrCode={ticket.qrCode}
              ticketNumber={idx + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
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
              {formatEventDate(item.eventDate)}
            </p>
            <p className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-base">confirmation_number</span>
              {item.quantity} x {item.ticketType}
            </p>
            {formatAmount(item.amount, item.currency) && (
              <p className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-base">payments</span>
                {formatAmount(item.amount, item.currency)}
              </p>
            )}
          </div>

          <TicketQRList tickets={item.tickets} />
        </article>
      ))}
    </div>
  );
}
