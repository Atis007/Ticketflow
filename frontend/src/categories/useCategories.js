import { useQuery } from "@tanstack/react-query";

import { fetchCategories } from "./category.api";

function sortCategories(data) {
  return [...data].sort((a, b) => {
    if (a.slug === "other") return 1;
    if (b.slug === "other") return -1;
    return a.name.localeCompare(b.name);
  });
}

export function useCategories() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
    select: sortCategories,
  });

  return {
    categories: data ?? [],
    loading: isLoading,
    error: error ? "Failed to load categories: " + error.message : null,
  };
}
