import { useState } from "react";

import { generateLayoutPreview } from "@/events/events.api";
import LayoutPreviewMap from "./LayoutPreviewMap";

const VENUE_TYPES = [
  { value: "concert_hall", label: "Concert Hall" },
  { value: "theater", label: "Theater" },
  { value: "arena", label: "Arena" },
  { value: "stadium", label: "Stadium" },
  { value: "club", label: "Club" },
  { value: "conference", label: "Conference" },
];

export default function VenueLayoutGenerator({ venueName: initialVenueName, capacity: initialCapacity, token, onAccept, onClose }) {
  const [venueType, setVenueType] = useState("concert_hall");
  const [venueName, setVenueName] = useState(initialVenueName || "");
  const [capacity, setCapacity] = useState(initialCapacity ? String(initialCapacity) : "");
  const [instructions, setInstructions] = useState("");
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      const result = await generateLayoutPreview(token, {
        venueName: venueName.trim(),
        venueType,
        capacity: Number(capacity),
        instructions: instructions.trim(),
      });
      setLayout(result.layout);
    } catch (err) {
      setError(err?.message || "Failed to generate layout.");
    } finally {
      setLoading(false);
    }
  }

  const totalSeats = layout?.sections?.reduce(
    (sum, section) => sum + section.rows.reduce((rowSum, row) => rowSum + (row.seatCount || row.seat_count || 0), 0),
    0,
  ) ?? 0;

  return (
    <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-primary">stadium</span>
          <span className="text-sm font-medium text-white">Venue Layout Generator</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px] text-text-muted">close</span>
        </button>
      </div>

      {!layout && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-soft">Venue Type</label>
              <select
                value={venueType}
                onChange={(e) => setVenueType(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-surface-mid px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none transition-colors"
              >
                {VENUE_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-soft">Venue Name</label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. Royal Albert Hall"
                className="w-full rounded-lg border border-white/10 bg-surface-mid px-3 py-2 text-sm text-white placeholder-text-muted focus:border-primary/50 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-soft">Capacity</label>
            <input
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="e.g. 500"
              className="w-full rounded-lg border border-white/10 bg-surface-mid px-3 py-2 text-sm text-white placeholder-text-muted focus:border-primary/50 focus:outline-none transition-colors sm:max-w-[200px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-soft">Describe Your Venue</label>
            <textarea
              rows={5}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Describe the inside of your venue: Where is the stage? How many levels? Where should VIP be? (e.g., 'Stage at the front, main floor with 20 rows, elevated balcony in the back, small VIP section on the left side')"
              className="w-full rounded-lg border border-white/10 bg-surface-mid px-3 py-2.5 text-sm text-white placeholder-text-muted focus:border-primary/50 focus:outline-none transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !capacity || Number(capacity) <= 0}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                Generating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                Generate Layout
              </>
            )}
          </button>

          {loading && (
            <p className="text-xs text-text-muted">
              AI is generating the venue layout. This may take up to 90 seconds...
            </p>
          )}
        </>
      )}

      {layout && (
        <>
          <LayoutPreviewMap layout={layout} />

          <div className="rounded-lg border border-accent-green/30 bg-accent-green/10 p-3">
            <p className="mb-3 text-sm font-medium text-accent-green">Layout generated successfully</p>

            <div className="space-y-1.5">
              {layout.sections.map((section, i) => {
                const sectionSeats = section.rows.reduce((s, r) => s + (r.seatCount || r.seat_count || 0), 0);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded border border-white/10 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-white">{section.name}</span>
                    <span className="text-text-muted">
                      {section.type === "standing" ? "Standing" : `${section.rows.length} rows`} &middot; {sectionSeats} seats
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-text-muted">
              Total capacity: <span className="font-semibold text-white">{totalSeats}</span> seats
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onAccept(layout)}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">check</span>
              Apply Layout
            </button>
            <button
              type="button"
              onClick={() => setLayout(null)}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-4 py-1.5 text-xs font-semibold text-text-soft hover:text-white transition-colors"
            >
              Regenerate
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-full border border-white/10 px-4 py-1.5 text-xs font-semibold text-text-soft hover:text-white transition-colors"
            >
              Discard
            </button>
          </div>
        </>
      )}
    </div>
  );
}
