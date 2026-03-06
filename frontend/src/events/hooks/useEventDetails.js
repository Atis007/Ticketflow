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

function toNumberPrice(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const normalized = String(value).replace(/[^0-9.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolvePurchaseMeta(eventPayload, fallback) {
  const rawPrice = eventPayload?.price ?? null;
  const fallbackPrice = fallback?.tickets?.[0]?.price ?? null;
  const price = toNumberPrice(rawPrice) ?? toNumberPrice(fallbackPrice) ?? 0;
  const isFree = typeof eventPayload?.is_free === "boolean"
    ? eventPayload.is_free
    : price <= 0;

  return {
    eventId: eventPayload?.id ?? null,
    isFree,
    price,
    currency: "RSD",
  };
}

function adaptDetail(eventPayload) {
  if (!eventPayload || typeof eventPayload !== "object") {
    return null;
  }

  const fallback = getEventDetail(eventPayload.slug);

  const purchase = resolvePurchaseMeta(eventPayload, fallback);

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
    purchase,
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
