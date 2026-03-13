import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AsyncState from "@/components/AsyncState";
import { useAuth } from "@/auth/context/AuthContext";
import { useEventSeats } from "./hooks/useEventSeats";
import { useRealtimeSeats } from "./hooks/useRealtimeSeats";
import { useReserveSeat } from "./hooks/useReserveSeat";

const SEAT_SIZE = 24;
const SEAT_GAP = 4;
const ROW_HEIGHT = SEAT_SIZE + SEAT_GAP;
const SECTION_HEADER_HEIGHT = 32;
const SECTION_GAP = 24;
const ROW_LABEL_WIDTH = 24;
const SVG_PADDING = 8;

const STATUS_COLORS = {
  available: {
    fill: "rgba(16,185,129,0.2)",
    stroke: "rgba(16,185,129,0.3)",
    text: "#6ee7b7",
  },
  selected: {
    fill: "rgba(6,182,212,0.25)",
    stroke: "rgba(34,211,238,1)",
    text: "#a5f3fc",
  },
  sold: {
    fill: "rgba(239,68,68,0.1)",
    stroke: "rgba(239,68,68,0.2)",
    text: "rgba(248,113,113,0.5)",
  },
  locked: {
    fill: "rgba(245,158,11,0.15)",
    stroke: "rgba(245,158,11,0.3)",
    text: "rgba(252,211,77,0.7)",
  },
};

function SeatRect({ x, y, seat, isSelected, onClick }) {
  const status = isSelected ? "selected" : seat.status;
  const colors = STATUS_COLORS[status] || STATUS_COLORS.available;
  const isClickable = seat.status === "available";

  return (
    <g
      onClick={isClickable ? onClick : undefined}
      style={{ cursor: isClickable ? "pointer" : "default" }}
    >
      <rect
        x={x}
        y={y}
        width={SEAT_SIZE}
        height={SEAT_SIZE}
        rx={4}
        ry={4}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={1}
      />
      <text
        x={x + SEAT_SIZE / 2}
        y={y + SEAT_SIZE / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={colors.text}
        fontSize={9}
        fontWeight="bold"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {seat.seatNumber}
      </text>
      <title>
        {`Row ${seat.rowLabel} · Seat ${seat.seatNumber} · ${isSelected ? "selected" : seat.status}`}
      </title>
    </g>
  );
}

export default function SeatMap({ eventId, onSelectionChange, maxSelectable = 1, disabled = false }) {
  const seatsQuery = useEventSeats(eventId, Boolean(eventId));
  useRealtimeSeats(eventId);
  const { token } = useAuth();
  const reserveSeat = useReserveSeat(eventId);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const isInteractive = typeof onSelectionChange === "function";

  const handleToggle = useCallback(
    async (seatId) => {
      if (!isInteractive || disabled) return;

      const isAdding = !selectedIds.has(seatId);

      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(seatId)) {
          next.delete(seatId);
        } else {
          if (next.size >= maxSelectable) {
            const first = next.values().next().value;
            next.delete(first);
          }
          next.add(seatId);
        }
        return next;
      });

      if (isAdding && token) {
        try {
          await reserveSeat.mutateAsync({ seatIds: [seatId], token });
        } catch {
          // Seat was already taken — rollback local selection
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(seatId);
            return next;
          });
        }
      }
    },
    [isInteractive, disabled, maxSelectable, selectedIds, token, reserveSeat],
  );

  const activeSelectedIds = useMemo(() => {
    if (selectedIds.size <= maxSelectable) return selectedIds;
    return new Set([...selectedIds].slice(0, maxSelectable));
  }, [selectedIds, maxSelectable]);

  useEffect(() => {
    if (!isInteractive) return;
    onSelectionChange([...activeSelectedIds]);
  }, [activeSelectedIds, isInteractive, onSelectionChange]);

  const sections = useMemo(() => {
    const seats = seatsQuery.data?.seats ?? [];
    const sectionMap = new Map();

    for (const seat of seats) {
      const sectionKey = seat.sectionId ?? "general";
      const sectionName = seat.sectionName ?? "General";

      if (!sectionMap.has(sectionKey)) {
        sectionMap.set(sectionKey, { id: sectionKey, name: sectionName, rowMap: new Map() });
      }

      const section = sectionMap.get(sectionKey);
      if (!section.rowMap.has(seat.rowLabel)) {
        section.rowMap.set(seat.rowLabel, []);
      }
      section.rowMap.get(seat.rowLabel).push(seat);
    }

    return Array.from(sectionMap.values()).map((section) => ({
      id: section.id,
      name: section.name,
      rows: Array.from(section.rowMap.entries()).map(([label, rowSeats]) => ({
        label,
        seats: rowSeats,
      })),
    }));
  }, [seatsQuery.data]);

  const hasLockedSeats = useMemo(
    () => (seatsQuery.data?.seats ?? []).some((s) => s.status === "locked"),
    [seatsQuery.data],
  );

  const { svgWidth, svgHeight } = useMemo(() => {
    let maxSeats = 0;
    let totalHeight = SVG_PADDING;

    for (let i = 0; i < sections.length; i++) {
      if (i > 0) totalHeight += SECTION_GAP;
      totalHeight += SECTION_HEADER_HEIGHT;
      totalHeight += sections[i].rows.length * ROW_HEIGHT;

      for (const row of sections[i].rows) {
        if (row.seats.length > maxSeats) maxSeats = row.seats.length;
      }
    }

    totalHeight += SVG_PADDING;
    const width = SVG_PADDING + ROW_LABEL_WIDTH + maxSeats * (SEAT_SIZE + SEAT_GAP) + SVG_PADDING;

    return { svgWidth: width, svgHeight: totalHeight };
  }, [sections]);

  const handleZoom = (delta) => {
    setZoomLevel((prev) => Math.min(2.0, Math.max(0.5, +(prev + delta).toFixed(2))));
  };

  const handleMouseDown = (e) => {
    const container = containerRef.current;
    if (!container) return;
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
    container.style.cursor = "grabbing";
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const container = containerRef.current;
    if (!container) return;
    container.scrollLeft = dragStart.current.scrollLeft - (e.clientX - dragStart.current.x);
    container.scrollTop = dragStart.current.scrollTop - (e.clientY - dragStart.current.y);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    const container = containerRef.current;
    if (container) container.style.cursor = "grab";
  };

  const summary = seatsQuery.data?.summary ?? null;

  if (seatsQuery.isPending) {
    return <AsyncState message="Loading seat map..." />;
  }

  if (seatsQuery.isError) {
    return <AsyncState type="error" message="Failed to load seats." />;
  }

  if (!seatsQuery.data?.isSeated || sections.length === 0) {
    return null;
  }

  let runningY = SVG_PADDING;

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Seat Map</span>
        <div className="flex items-center gap-3">
          {summary && (
            <span className="text-xs text-text-muted">
              <span className="text-emerald-300">{summary.available}</span> available ·{" "}
              <span className="text-red-400">{summary.sold}</span> sold
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleZoom(-0.25)}
              disabled={zoomLevel <= 0.5}
              className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-text-muted hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40"
              aria-label="Zoom out"
            >
              <span className="material-symbols-outlined text-sm">remove</span>
            </button>
            <span className="text-xs text-text-muted w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={() => handleZoom(0.25)}
              disabled={zoomLevel >= 2.0}
              className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-text-muted hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40"
              aria-label="Zoom in"
            >
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="overflow-auto rounded-lg border border-white/5 bg-black/20 pb-1 max-h-[400px] sm:max-h-[500px]"
        style={{ cursor: "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width={svgWidth * zoomLevel}
          height={svgHeight * zoomLevel}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {sections.map((section, sectionIndex) => {
            if (sectionIndex > 0) runningY += SECTION_GAP;
            const sectionStartY = runningY;

            const sectionContent = (
              <g key={section.id}>
                <text
                  x={SVG_PADDING}
                  y={sectionStartY + 18}
                  fill="#a1a1aa"
                  fontSize={13}
                  fontWeight="600"
                >
                  {section.name}
                </text>

                {section.rows.map((row, rowIndex) => {
                  const rowY = sectionStartY + SECTION_HEADER_HEIGHT + rowIndex * ROW_HEIGHT;
                  return (
                    <g key={row.label}>
                      <text
                        x={SVG_PADDING + ROW_LABEL_WIDTH - 4}
                        y={rowY + SEAT_SIZE / 2}
                        textAnchor="end"
                        dominantBaseline="central"
                        fill="#71717a"
                        fontSize={10}
                        fontWeight="600"
                      >
                        {row.label}
                      </text>
                      {row.seats.map((seat, seatIndex) => (
                        <SeatRect
                          key={seat.id}
                          x={SVG_PADDING + ROW_LABEL_WIDTH + seatIndex * (SEAT_SIZE + SEAT_GAP)}
                          y={rowY}
                          seat={seat}
                          isSelected={activeSelectedIds.has(seat.id)}
                          onClick={() => handleToggle(seat.id)}
                        />
                      ))}
                    </g>
                  );
                })}
              </g>
            );

            runningY = sectionStartY + SECTION_HEADER_HEIGHT + section.rows.length * ROW_HEIGHT;
            return sectionContent;
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12"><rect width="12" height="12" rx="2" fill={STATUS_COLORS.available.fill} stroke={STATUS_COLORS.available.stroke} strokeWidth="1" /></svg>
          Available
        </span>
        {isInteractive && (
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12"><rect width="12" height="12" rx="2" fill={STATUS_COLORS.selected.fill} stroke={STATUS_COLORS.selected.stroke} strokeWidth="1" /></svg>
            Selected
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12"><rect width="12" height="12" rx="2" fill={STATUS_COLORS.sold.fill} stroke={STATUS_COLORS.sold.stroke} strokeWidth="1" /></svg>
          Sold
        </span>
        {hasLockedSeats && (
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12"><rect width="12" height="12" rx="2" fill={STATUS_COLORS.locked.fill} stroke={STATUS_COLORS.locked.stroke} strokeWidth="1" /></svg>
            Locked
          </span>
        )}
      </div>
    </div>
  );
}
