import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getEventsByCategorySlug } from "../events.api";
import { eventsKeys } from "../events.queryKeys";

function formatDateLabel(rawStartsAt) {
  if (!rawStartsAt) {
    return "TBD 00";
  }

  const normalized = String(rawStartsAt).replace(" ", "T").replace(/\./g, "-");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return "TBD 00";
  }

  const month = parsed.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${month} ${day}`;
}

function toCardModel(item) {
  return {
    id: item.id,
    slug: item.slug,
    categorySlug: item.category_slug,
    title: item.title,
    image: item.image || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80",
    dateLabel: formatDateLabel(item.starts_at),
    icon: "event",
    category: item.category_name || "Event",
    location: [item.city, item.venue].filter(Boolean).join(", "),
    tag: item.subcategory_name || item.category_name || "General",
    priceLabel: item.is_free ? "Free" : `$${Number(item.price || 0).toFixed(2)}`,
  };
}

export function useEvents(categorySlug) {
  const query = useQuery({
    queryKey: eventsKeys.list(categorySlug),
    enabled: Boolean(categorySlug),
    queryFn: async () => getEventsByCategorySlug(categorySlug),
    placeholderData: (previous) => previous,
  });

  const events = useMemo(() => {
    const rows = query.data?.data?.events;
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map(toCardModel);
  }, [query.data]);

  return {
    ...query,
    events,
  };
}
