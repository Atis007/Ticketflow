import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getEventDetail } from "../mockEventDetails";
import { getEventDetailsByCategorySlug } from "../events.api";
import { eventsKeys } from "../events.queryKeys";

function formatDateTime(rawStartsAt) {
  if (!rawStartsAt) {
    return "Date TBA";
  }

  const normalized = String(rawStartsAt).replace(" ", "T").replace(/\./g, "-");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return String(rawStartsAt);
  }

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toArrayDescription(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    return value
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [];
}

function adaptDetail(eventPayload) {
  if (!eventPayload || typeof eventPayload !== "object") {
    return null;
  }

  const fallback = getEventDetail(eventPayload.slug);

  return {
    ...fallback,
    id: eventPayload.id,
    slug: eventPayload.slug,
    title: eventPayload.title,
    heroImage: eventPayload.image || fallback.heroImage,
    venue: eventPayload.venue || fallback.venue,
    location: [eventPayload.city, eventPayload.venue].filter(Boolean).join(", ") || fallback.location,
    dateTime: formatDateTime(eventPayload.starts_at),
    categoryBadges: [
      { label: eventPayload.category_name || "Event", tone: "primary" },
      { label: eventPayload.subcategory_name || "General", tone: "neutral" },
    ],
    description: toArrayDescription(eventPayload.description).length > 0 ? toArrayDescription(eventPayload.description) : fallback.description,
    tickets: fallback.tickets,
    lineup: fallback.lineup,
    similar: fallback.similar,
  };
}

export function useEventDetails(categorySlug, eventSlug) {
  const query = useQuery({
    queryKey: eventsKeys.detail(categorySlug, eventSlug),
    enabled: Boolean(categorySlug && eventSlug),
    queryFn: async () => getEventDetailsByCategorySlug(categorySlug, eventSlug),
    placeholderData: (previous) => previous,
  });

  const event = useMemo(() => {
    const payload = query.data?.event;
    return adaptDetail(payload);
  }, [query.data]);

  return {
    ...query,
    event,
  };
}
