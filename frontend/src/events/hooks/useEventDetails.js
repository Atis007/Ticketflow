import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getEventDetailsByCategorySlug } from "../events.api";
import { eventsKeys } from "../events.queryKeys";
import { formatEventDate } from "@/utils/formatDate";

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

function buildTicketsFromApiEvent(eventPayload) {
  if (!eventPayload || eventPayload.is_free) return [];
  const price = parseFloat(eventPayload.price) || 0;
  return [
    {
      id: "general",
      name: "General Admission",
      description: "Standard entry ticket",
      price: `RSD ${price.toFixed(2)}`,
      featured: true,
    },
  ];
}

function resolvePurchaseMeta(eventPayload) {
  const rawPrice = eventPayload?.price ?? null;
  const price = toNumberPrice(rawPrice) ?? 0;
  const isFree = typeof eventPayload?.is_free === "boolean"
    ? eventPayload.is_free
    : price <= 0;

  return {
    eventId: eventPayload?.id ?? null,
    isFree,
    isSeated: Boolean(eventPayload?.is_seated),
    price,
    currency: "RSD",
  };
}

function adaptDetail(eventPayload) {
  if (!eventPayload || typeof eventPayload !== "object") {
    return null;
  }

  const purchase = resolvePurchaseMeta(eventPayload);

  return {
    id: eventPayload.id,
    slug: eventPayload.slug,
    title: eventPayload.title,
    createdBy: eventPayload.created_by || null,
    heroImage: eventPayload.image || null,
    venue: eventPayload.venue || null,
    location: [eventPayload.city, eventPayload.venue].filter(Boolean).join(", ") || null,
    dateTime: formatEventDate(eventPayload.starts_at),
    categoryBadges: [
      { label: eventPayload.category_name || "Event", tone: "primary" },
      { label: eventPayload.subcategory_name || "General", tone: "neutral" },
    ],
    description: toArrayDescription(eventPayload.description),
    tickets: buildTicketsFromApiEvent(eventPayload),
    lineup: [],
    similar: [],
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
