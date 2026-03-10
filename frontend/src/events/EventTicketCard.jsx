import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useQueryClient } from "@tanstack/react-query";

import AsyncState from "@/components/AsyncState";
import { useAuth } from "@/auth/context/AuthContext";
import { useSimulatePurchase } from "@/purchases/hooks/useSimulatePurchase";
import { useConfirmPayment } from "@/purchases/hooks/useConfirmPayment";
import { eventsKeys } from "./events.queryKeys";
import SeatMap from "./SeatMap";

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
  const queryClient = useQueryClient();
  const simulatePurchase = useSimulatePurchase();
  const confirmPayment = useConfirmPayment();

  const [quantity, setQuantity] = useState(1);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
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
  const isSeated = Boolean(purchase?.isSeated);
  const total = price * quantity;
  const isSubmitting = simulatePurchase.isPending;
  const needsSeats = isSeated && selectedSeatIds.length === 0;
  const canCheckout = Boolean(eventId && !isFree && !isSubmitting && token && !needsSeats);

  const handleQuantityChange = (next) => {
    const clamped = clamp(typeof next === "number" ? next : quantity, 1, 20);
    setQuantity(clamped);
    setSelectedSeatIds((prev) => (prev.length > clamped ? prev.slice(0, clamped) : prev));
  };

  const handleSubmit = async () => {
    if (!canCheckout) return;

    setFeedback(null);

    try {
      const payload = {
        token,
        eventId,
        quantity,
        simulateOutcome: "success",
        currency,
      };

      if (isSeated && selectedSeatIds.length > 0) {
        payload.seatIds = selectedSeatIds;
      }

      const response = await simulatePurchase.mutateAsync(payload);

      setFeedback({
        type: "info",
        message: response?.payment?.id
          ? `Purchase successful. Payment #${response.payment.id} · ${response.tickets?.length || 0} ticket(s).`
          : response?.message || "Purchase simulated successfully.",
        success: true,
        paymentId: response?.payment?.id ?? null,
        ticketCount: response?.tickets?.length || 0,
        ipsQrPayload: response?.payment?.ipsQrPayload ?? null,
        confirmed: false,
      });

      setSelectedSeatIds([]);
      queryClient.invalidateQueries({ queryKey: eventsKeys.seats(eventId) });
      queryClient.invalidateQueries({ queryKey: ["profile", "purchases"] });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Checkout failed.",
        success: false,
        ipsQrPayload: null,
      });
    }
  };

  const handleConfirmPayment = async () => {
    if (!feedback?.paymentId || !token) return;

    try {
      await confirmPayment.mutateAsync({ token, paymentId: feedback.paymentId });
      setFeedback((prev) => ({
        ...prev,
        type: "info",
        message: "Payment confirmed — tickets are ready!",
        confirmed: true,
      }));
    } catch (error) {
      setFeedback((prev) => ({
        ...prev,
        type: "error",
        message: error instanceof Error ? error.message : "Payment confirmation failed.",
      }));
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

      {isSeated && !isFree && !feedback?.success && (
        <>
          <SeatMap
            eventId={eventId}
            onSelectionChange={setSelectedSeatIds}
            maxSelectable={quantity}
            disabled={isSubmitting}
          />
          {selectedSeatIds.length > 0 && (
            <p className="text-xs text-cyan-300 mb-4">
              {selectedSeatIds.length} of {quantity} seat{quantity !== 1 ? "s" : ""} selected
            </p>
          )}
        </>
      )}

      {feedback ? (
        <div className="mb-4">
          <AsyncState type={feedback.type} message={feedback.message} />
          {feedback.success ? (
            <>
              {feedback.ticketCount > 0 && (
                <p className="mt-2 text-xs text-text-muted">
                  {feedback.ticketCount} ticket{feedback.ticketCount !== 1 ? "s" : ""} generated
                </p>
              )}

              {feedback.ipsQrPayload && !feedback.confirmed ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-background-dark p-4 flex flex-col items-center gap-3">
                  <p className="text-xs text-text-muted text-center">
                    IPS Payment QR — scan with your banking app
                  </p>
                  <QRCodeSVG
                    value={feedback.ipsQrPayload}
                    size={160}
                    bgColor="transparent"
                    fgColor="#ffffff"
                    level="M"
                  />
                  <p className="text-[10px] text-text-muted break-all text-center max-w-60">
                    {feedback.ipsQrPayload}
                  </p>
                </div>
              ) : null}

              <div className="mt-3 flex items-center gap-3">
                {feedback.paymentId && !feedback.confirmed && (
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={confirmPayment.isPending}
                    className="inline-flex h-10 items-center rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {confirmPayment.isPending ? "Confirming..." : "Confirm Payment"}
                  </button>
                )}
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
            </>
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
            {isSubmitting ? "Processing..." : needsSeats ? "Select Seats to Checkout" : "Checkout"}
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
