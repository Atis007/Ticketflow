import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import AsyncState from "@/components/AsyncState";
import { useAuth } from "@/auth/context/AuthContext";
import { useSimulatePurchase } from "@/purchases/hooks/useSimulatePurchase";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatMoney(amount, currency) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return `0 ${currency || "RSD"}`;
  }

  return `${currency || "RSD"} ${amount.toFixed(2)}`;
}

export default function EventTicketCard({ tickets, purchase }) {
  const { token } = useAuth();
  const simulatePurchase = useSimulatePurchase();

  const [quantity, setQuantity] = useState(1);
  const [selectedTicketId, setSelectedTicketId] = useState(() => {
    const featured = tickets?.find((ticket) => ticket.featured);
    return featured?.id ?? tickets?.[0]?.id ?? "";
  });
  const [feedback, setFeedback] = useState(null);

  const eventId = useMemo(() => {
    const rawId = purchase?.eventId;
    const parsed = typeof rawId === "number" ? rawId : Number(rawId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [purchase?.eventId]);

  const price = typeof purchase?.price === "number" ? purchase.price : 0;
  const currency = purchase?.currency || "RSD";
  const isFree = Boolean(purchase?.isFree);
  const total = price * quantity;
  const isSubmitting = simulatePurchase.isPending;
  const canCheckout = Boolean(eventId && !isFree && !isSubmitting && token);

  const handleQuantityChange = (next) => {
    setQuantity((prev) => clamp(typeof next === "number" ? next : prev, 1, 20));
  };

  const handleSubmit = async () => {
    if (!canCheckout) {
      return;
    }

    setFeedback(null);

    try {
      const response = await simulatePurchase.mutateAsync({
        token,
        eventId,
        quantity,
        simulateOutcome: "success",
        currency,
      });

      if (response?.payment?.id) {
        setFeedback({
          type: "info",
          message: `Purchase simulated successfully. Payment #${response.payment.id} created for ${response.tickets?.length || 0} ticket(s).`,
          success: true,
        });
      } else {
        setFeedback({
          type: "info",
          message: response?.message || "Purchase simulated successfully.",
          success: true,
        });
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Checkout failed.",
        success: false,
      });
    }
  };

  return (
    <div className="bg-surface-dark/50 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
      <h3 className="text-white text-xl font-bold mb-6">Select Tickets</h3>

      {tickets.map((ticket) => (
        <div key={ticket.id} className="mb-4 last:mb-6">
          <label
            className={`relative flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors group ${
              ticket.featured
                ? "border-primary/30 bg-background-dark hover:border-primary"
                : "border-white/10 bg-background-dark hover:border-primary"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="ticket-type"
                checked={selectedTicketId === ticket.id}
                onChange={() => setSelectedTicketId(ticket.id)}
                className="mt-1 bg-transparent border-text-muted text-primary focus:ring-primary focus:ring-offset-background-dark"
              />
              <div>
                <div className="text-white font-bold group-hover:text-primary transition-colors">
                  {ticket.name}
                </div>
                <div className="text-text-muted text-sm mt-1">{ticket.description}</div>
              </div>
            </div>
            <div className="text-white font-bold text-lg">{ticket.price}</div>
          </label>
        </div>
      ))}

      {feedback ? (
        <div className="mb-4">
          <AsyncState type={feedback.type} message={feedback.message} />
          {feedback.success ? (
            <div className="mt-3 flex items-center gap-3">
              <Link
                to="/profile"
                className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-color-hover"
              >
                Go to Profile
              </Link>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="inline-flex h-10 items-center rounded-full border border-white/20 px-4 text-sm font-semibold text-text-soft transition-colors hover:border-primary hover:text-primary"
              >
                Close
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {isFree ? (
        <AsyncState message="This event is free and ticketless." className="mb-4" />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 border-t border-white/10 pt-6">
            <span className="text-white font-medium">Quantity</span>
            <div className="flex items-center gap-4 bg-background-dark rounded-full px-2 py-1 border border-white/10">
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
                className="size-8 rounded-full flex items-center justify-center text-text-muted hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:hover:text-text-muted"
                aria-label="Decrease quantity"
              >
                <span className="material-symbols-outlined text-sm">remove</span>
              </button>
              <span className="text-white font-bold w-4 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= 20}
                className="size-8 rounded-full flex items-center justify-center text-text-muted hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:hover:text-text-muted"
                aria-label="Increase quantity"
              >
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="text-text-muted">Total</span>
            <span className="text-white text-2xl font-bold">{formatMoney(total, currency)}</span>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canCheckout}
            className="w-full bg-primary hover:bg-color-hover hover:shadow-glow-primary-soft transition-all duration-300 text-white font-bold py-4 rounded-full text-lg tracking-wide flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:shadow-none"
          >
            <span className="material-symbols-outlined">confirmation_number</span>
            {isSubmitting ? "Processing..." : "Checkout"}
          </button>
        </>
      )}

      <p className="text-center text-text-muted text-xs mt-4 flex items-center justify-center gap-1">
        <span className="material-symbols-outlined text-xs">lock</span>
        Secure transaction powered by Ticketflow
      </p>
    </div>
  );
}
