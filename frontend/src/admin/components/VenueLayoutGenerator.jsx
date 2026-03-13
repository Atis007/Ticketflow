import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/auth/context/AuthContext";
import { enhanceContent } from "../api/ai.api";
import { generateLayout } from "../api/events.api";
import { adminQueryKeys } from "../api/queryKeys";
import { AdminButton } from "./AdminButton";
import { AdminInput, AdminSelect, AdminTextarea } from "./AdminInput";

const VENUE_TYPES = [
  { value: "concert_hall", label: "Concert Hall" },
  { value: "theater", label: "Theater" },
  { value: "arena", label: "Arena" },
  { value: "stadium", label: "Stadium" },
  { value: "club", label: "Club" },
  { value: "conference", label: "Conference" },
];

export default function VenueLayoutGenerator({ eventId, eventVenue, eventCapacity, onGenerated }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [venueType, setVenueType] = useState("concert_hall");
  const [venueName, setVenueName] = useState(eventVenue || "");
  const [capacity, setCapacity] = useState(eventCapacity ? String(eventCapacity) : "");
  const [instructions, setInstructions] = useState("");
  const [layout, setLayout] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState(null);

  const mutation = useMutation({
    mutationFn: (params) => generateLayout({ token, eventId, ...params }),
    onSuccess: (data) => {
      setLayout(data.layout);
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.events.all });
      queryClient.invalidateQueries({ queryKey: ["events", "seats", eventId] });
      onGenerated?.();
    },
  });

  const handleGenerate = async () => {
    setEnhanceError(null);
    const params = { venueType };
    if (venueName.trim()) params.venueName = venueName.trim();
    if (capacity && Number(capacity) > 0) params.capacity = Number(capacity);

    let finalInstructions = instructions.trim();
    if (finalInstructions) {
      setIsEnhancing(true);
      try {
        const result = await enhanceContent({
          token,
          title: venueName.trim() || venueType,
          description: finalInstructions,
        });
        finalInstructions = result?.enhanced?.description ?? finalInstructions;
      } catch (err) {
        setIsEnhancing(false);
        setEnhanceError(err?.message || "AI enhancement service is unavailable. Please try again.");
        return;
      }
      setIsEnhancing(false);
      params.instructions = finalInstructions;
    }

    mutation.mutate(params);
  };

  const totalSeats = layout?.sections?.reduce(
    (sum, section) => sum + section.rows.reduce((rowSum, row) => rowSum + row.seatCount, 0),
    0,
  ) ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AdminSelect
          label="Venue Type"
          value={venueType}
          onChange={(e) => setVenueType(e.target.value)}
        >
          {VENUE_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </AdminSelect>

        <AdminInput
          label="Venue Name"
          value={venueName}
          onChange={(e) => setVenueName(e.target.value)}
          placeholder="e.g. Royal Albert Hall"
        />

        <AdminInput
          label="Capacity"
          type="number"
          min="1"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="e.g. 500"
        />
      </div>

      <AdminTextarea
        label="Instructions (optional)"
        rows={3}
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Describe the venue layout you want (e.g., 'VIP section in front, 2 balcony levels')..."
      />

      {enhanceError && (
        <div className="rounded-lg border border-[var(--admin-status-error-border)] bg-[var(--admin-status-error-bg)] px-4 py-3 text-[var(--admin-text-small)] text-[var(--admin-status-error)]">
          {enhanceError}
        </div>
      )}

      {mutation.isError && (
        <div className="rounded-lg border border-[var(--admin-status-error-border)] bg-[var(--admin-status-error-bg)] px-4 py-3 text-[var(--admin-text-small)] text-[var(--admin-status-error)]">
          {mutation.error?.message || "Failed to generate layout."}
        </div>
      )}

      <AdminButton
        variant="primary"
        onClick={handleGenerate}
        loading={isEnhancing || mutation.isPending}
        disabled={isEnhancing || mutation.isPending}
        icon={<span className="material-symbols-outlined text-base">auto_awesome</span>}
        iconPosition="left"
      >
        {isEnhancing || mutation.isPending ? "Generating Layout..." : "Generate Layout"}
      </AdminButton>

      {(isEnhancing || mutation.isPending) && (
        <p className="text-[var(--admin-text-muted)] text-[var(--admin-text-small)]">
          {isEnhancing
            ? "Refining your description with AI..."
            : "AI is generating the venue layout. This may take up to 90 seconds..."}
        </p>
      )}

      {layout && (
        <div className="mt-2 rounded-lg border border-[var(--admin-status-success-border)] bg-[var(--admin-status-success-bg)] p-4">
          <p className="mb-3 font-medium text-[var(--admin-status-success)]">
            Layout generated — seats are now available for the event
          </p>

          <div className="space-y-2">
            {layout.sections.map((section, i) => {
              const sectionSeats = section.rows.reduce((s, r) => s + r.seatCount, 0);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded border border-[var(--admin-border)] px-3 py-2 text-[var(--admin-text-small)]"
                >
                  <span className="font-medium text-[var(--admin-text-primary)]">{section.name}</span>
                  <span className="text-[var(--admin-text-muted)]">
                    {section.type === "standing" ? "Standing" : `${section.rows.length} rows`} · {sectionSeats} seats
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-[var(--admin-text-small)] text-[var(--admin-text-muted)]">
            Total capacity: <span className="font-semibold text-[var(--admin-text-primary)]">{totalSeats}</span> seats
          </p>
        </div>
      )}
    </div>
  );
}
