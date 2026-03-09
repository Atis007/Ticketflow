import { useMemo } from "react";

import AsyncState from "@/components/AsyncState";
import { useEventSeats } from "./hooks/useEventSeats";

function SeatCell({ seat }) {
  const isAvailable = seat.status === "available";

  return (
    <div
      title={`Row ${seat.rowLabel} · Seat ${seat.seatNumber} · ${seat.status}`}
      className={`flex h-7 w-7 items-center justify-center rounded text-[10px] font-bold transition-colors ${
        isAvailable
          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          : "bg-red-500/10 text-red-400/50 border border-red-500/20 cursor-not-allowed"
      }`}
    >
      {seat.seatNumber}
    </div>
  );
}

export default function SeatMap({ eventId }) {
  const seatsQuery = useEventSeats(eventId, Boolean(eventId));

  const rows = useMemo(() => {
    const seats = seatsQuery.data?.seats ?? [];
    const map = new Map();
    for (const seat of seats) {
      if (!map.has(seat.rowLabel)) {
        map.set(seat.rowLabel, []);
      }
      map.get(seat.rowLabel).push(seat);
    }
    return Array.from(map.entries()).map(([label, seats]) => ({ label, seats }));
  }, [seatsQuery.data]);

  const summary = seatsQuery.data?.summary ?? null;

  if (seatsQuery.isPending) {
    return <AsyncState message="Loading seat map..." />;
  }

  if (seatsQuery.isError) {
    return <AsyncState type="error" message="Failed to load seats." />;
  }

  if (!seatsQuery.data?.isSeated || rows.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Seat Map</span>
        {summary && (
          <span className="text-xs text-text-muted">
            <span className="text-emerald-300">{summary.available}</span> available ·{" "}
            <span className="text-red-400">{summary.sold}</span> sold
          </span>
        )}
      </div>

      <div className="space-y-2 overflow-x-auto pb-1">
        {rows.map(({ label, seats }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-6 text-right text-xs font-semibold text-text-muted">{label}</span>
            <div className="flex flex-wrap gap-1">
              {seats.map((seat) => (
                <SeatCell key={seat.id} seat={seat} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-red-500/10 border border-red-500/20" />
          Sold
        </span>
      </div>
    </div>
  );
}
