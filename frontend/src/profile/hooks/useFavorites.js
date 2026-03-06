import { useQuery } from "@tanstack/react-query";

import { getFavorites } from "../profile.api";

export function useFavorites(token, enabled = true) {
  return useQuery({
    queryKey: ["profile", "favorites", token],
    enabled: Boolean(enabled && token),
    queryFn: async () => {
      const response = await getFavorites(token);
      return response?.favorites ?? [];
    },
    staleTime: 60 * 1000,
  });
}
