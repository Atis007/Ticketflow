import { Link } from "react-router-dom";

import AsyncState from "@/components/AsyncState";
import { useAuth } from "@/auth/context/AuthContext";
import { usePurchases } from "@/profile/hooks/usePurchases";
import TicketQR from "@/purchases/TicketQR";
import { formatEventDate } from "@/utils/formatDate";

export default function MyTicketsPage() {
  const { token, isAuthenticated, isVerified } = useAuth();
  const purchasesQuery = usePurchases(token, isAuthenticated && isVerified);

  const now = new Date();
  const purchases = purchasesQuery.data ?? [];

  const upcoming = purchases.filter(
    (p) => p.status === "paid" && new Date(p.eventDate) >= now,
  );
  const past = purchases.filter(
    (p) => p.status === "paid" && new Date(p.eventDate) < now,
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-2 pt-6 pb-10 sm:px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Tickets</h1>
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to profile
        </Link>
      </div>

      {purchasesQuery.isPending && <AsyncState message="Loading tickets..." />}
      {purchasesQuery.isError && (
        <AsyncState
          type="error"
          message={purchasesQuery.error?.message || "Failed to load tickets."}
          onRetry={() => purchasesQuery.refetch()}
        />
      )}

      {!purchasesQuery.isPending && !purchasesQuery.isError && (
        <>
          <TicketSection title="Upcoming Events" purchases={upcoming} emptyText="No upcoming events." />
          <TicketSection title="Past Events" purchases={past} emptyText="No past events." />
        </>
      )}
    </div>
  );
}

function TicketSection({ title, purchases, emptyText }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">{title}</h2>
      {purchases.length === 0 ? (
        <p className="text-sm text-text-muted">{emptyText}</p>
      ) : (
        <div className="space-y-6">
          {purchases.map((purchase) => (
            <PurchaseTickets key={purchase.id} purchase={purchase} />
          ))}
        </div>
      )}
    </section>
  );
}

function PurchaseTickets({ purchase }) {
  const tickets = purchase.tickets ?? [];

  return (
    <div className="rounded-xl border border-white/10 bg-background-dark/50 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-white">{purchase.eventName}</h3>
          <p className="text-sm text-text-muted mt-0.5">{formatEventDate(purchase.eventDate)}</p>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold uppercase text-emerald-300">
          {purchase.status}
        </span>
      </div>

      {tickets.length === 0 ? (
        <p className="text-xs text-text-muted">No ticket QR codes available.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tickets.map((ticket, idx) => (
            <TicketQR
              key={ticket.id || idx}
              qrCode={ticket.qrCode}
              ticketNumber={idx + 1}
              eventTitle={purchase.eventName}
              seatInfo={ticket.seatLabel ?? undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
