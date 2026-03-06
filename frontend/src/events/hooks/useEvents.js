import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { getEvents, getEventsByCategorySlug } from "../events.api";
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
  const title = item.title || "Untitled Event";
  const location = [item.city, item.venue].filter(Boolean).join(", ") || "TBA";
  const categorySlug = item.subcategory_slug || item.category_slug || null;
  const category = item.category_name || "Event";
  const tag = item.subcategory_name || item.category_name || "General";
  const isFree = Boolean(item.is_free);
  const priceValue = Number(item.price || 0);

  return {
    id: item.id,
    slug: item.slug,
    categorySlug,
    title,
    image: item.image || "",
    dateLabel: formatDateLabel(item.starts_at),
    icon: "event",
    category,
    location,
    tag,
    isFree,
    priceLabel: isFree ? "Free" : `$${Number.isFinite(priceValue) ? priceValue.toFixed(2) : "0.00"}`,
  };
}

export function useEvents(categorySlug) {
  const query = useInfiniteQuery({
    queryKey: eventsKeys.list(categorySlug ?? "all"),
    queryFn: async ({ pageParam = 1 }) => {
      if (categorySlug) {
        return getEventsByCategorySlug(categorySlug, { page: pageParam, pageSize: 20 });
      }

      return getEvents({ page: pageParam, pageSize: 20 });
    },
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.pagination;
      if (!pagination) {
        return undefined;
      }

      const current = Number(pagination.page || 1);
      const totalPages = Number(pagination.totalPages || 1);
      return current < totalPages ? current + 1 : undefined;
    },
    placeholderData: (previous) => previous,
  });

  const events = useMemo(() => {
    const pages = query.data?.pages ?? [];
    const allItems = pages.flatMap((page) => page?.items ?? page?.events ?? []);
    return allItems.map(toCardModel);
  }, [query.data]);

  return {
    ...query,
    events,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}
