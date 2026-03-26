import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/auth/context/AuthContext";
import { useReserveSeat } from "./hooks/useReserveSeat";
import SeatMap from "./SeatMap";

export default function SeatMapModal({ open, onClose, onConfirm, eventId, maxSelectable, disabled }) {
  const { token } = useAuth();
  const reserveSeat = useReserveSeat(eventId);
  const [localSelection, setLocalSelection] = useState([]);
  const [prevOpen, setPrevOpen] = useState(false);
  const [reserveError, setReserveError] = useState(null);
  const backdropRef = useRef(null);

  if (open && !prevOpen) {
    setLocalSelection([]);
    setReserveError(null);
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

  useEffect(() => {
    if (!open) return;

    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const handleSelectionChange = useCallback((ids) => {
    setLocalSelection(ids);
  }, []);

  const handleConfirm = async () => {
    if (localSelection.length === 0) return;
    setReserveError(null);

    try {
      await reserveSeat.mutateAsync({ seatIds: localSelection, token });
      onConfirm(localSelection);
      onClose();
    } catch (err) {
      setReserveError(
        err?.message || "Some seats are no longer available. Please try different seats.",
      );
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  if (!open) return null;

  return createPortal(
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      <div className="absolute inset-0 bg-background-dark/85 backdrop-blur-md" />

      <div className="relative z-10 flex flex-col w-full max-w-5xl max-h-[95vh] rounded-2xl border border-white/10 bg-surface-dark shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10 shrink-0">
          <div className="min-w-0">
            <h2 className="font-display text-lg text-white truncate">Select Your Seats</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Tap available seats to select them
              {maxSelectable > 1 ? ` (up to ${maxSelectable})` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {localSelection.length > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                <span className="material-symbols-outlined text-sm">event_seat</span>
                {localSelection.length} / {maxSelectable}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-text-muted hover:border-white/30 hover:text-white transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Body — seat map fills available space */}
        <div className="flex-1 overflow-hidden px-2 py-3 sm:px-4 sm:py-4 min-h-0">
          <SeatMap
            eventId={eventId}
            onSelectionChange={handleSelectionChange}
            maxSelectable={maxSelectable}
            disabled={disabled}
            modalMode
          />
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 px-5 py-4 border-t border-white/10 shrink-0">
          {reserveError && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">error</span>
              {reserveError}
            </p>
          )}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 sm:hidden">
              {localSelection.length > 0 && (
                <span className="text-xs font-semibold text-cyan-300">
                  {localSelection.length} / {maxSelectable} selected
                </span>
              )}
            </div>
            <div className="sm:block hidden" />

            <button
              type="button"
              onClick={handleConfirm}
              disabled={localSelection.length === 0 || reserveSeat.isPending}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white transition-all hover:bg-color-hover hover:shadow-glow-primary-soft disabled:opacity-50 disabled:hover:shadow-none"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {reserveSeat.isPending
                ? "Reserving..."
                : localSelection.length === 0
                  ? "Select seats to continue"
                  : `Confirm ${localSelection.length} seat${localSelection.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
