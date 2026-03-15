import { useMemo, useRef, useState } from "react";

const SEAT_SIZE = 24;
const SEAT_GAP = 4;
const ROW_HEIGHT = SEAT_SIZE + SEAT_GAP;
const SECTION_HEADER_HEIGHT = 32;
const SECTION_GAP = 24;
const ROW_LABEL_WIDTH = 24;
const SVG_PADDING = 8;

const SEAT_COLORS = {
  fill: "rgba(16,185,129,0.2)",
  stroke: "rgba(16,185,129,0.3)",
  text: "#6ee7b7",
};

function PreviewSeat({ x, y, seatNumber }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={SEAT_SIZE}
        height={SEAT_SIZE}
        rx={4}
        ry={4}
        fill={SEAT_COLORS.fill}
        stroke={SEAT_COLORS.stroke}
        strokeWidth={1}
      />
      <text
        x={x + SEAT_SIZE / 2}
        y={y + SEAT_SIZE / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={SEAT_COLORS.text}
        fontSize={9}
        fontWeight="bold"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {seatNumber}
      </text>
    </g>
  );
}

export default function LayoutPreviewMap({ layout }) {
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const sections = useMemo(() => {
    if (!layout?.sections) return [];
    return layout.sections.map((section) => ({
      name: section.name,
      type: section.type,
      rows: section.rows.map((row) => ({
        label: row.label || row.row_label || "",
        seatCount: row.seatCount || row.seat_count || 0,
      })),
    }));
  }, [layout]);

  const { svgWidth, svgHeight, sectionOffsets } = useMemo(() => {
    let maxSeats = 0;
    let y = SVG_PADDING;
    const offsets = [];

    for (let i = 0; i < sections.length; i++) {
      if (i > 0) y += SECTION_GAP;
      offsets.push(y);
      y += SECTION_HEADER_HEIGHT;
      y += sections[i].rows.length * ROW_HEIGHT;

      for (const row of sections[i].rows) {
        if (row.seatCount > maxSeats) maxSeats = row.seatCount;
      }
    }

    y += SVG_PADDING;
    const width = SVG_PADDING + ROW_LABEL_WIDTH + maxSeats * (SEAT_SIZE + SEAT_GAP) + SVG_PADDING;

    return { svgWidth: width, svgHeight: y, sectionOffsets: offsets };
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

  if (sections.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-text-soft">Layout Preview</span>
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

      <div
        ref={containerRef}
        className="overflow-auto rounded-lg border border-white/5 bg-black/20 pb-1 max-h-[350px]"
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
            const sectionStartY = sectionOffsets[sectionIndex];
            return (
              <g key={sectionIndex}>
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
                    <g key={rowIndex}>
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
                      {Array.from({ length: row.seatCount }, (_, seatIndex) => (
                        <PreviewSeat
                          key={seatIndex}
                          x={SVG_PADDING + ROW_LABEL_WIDTH + seatIndex * (SEAT_SIZE + SEAT_GAP)}
                          y={rowY}
                          seatNumber={seatIndex + 1}
                        />
                      ))}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
