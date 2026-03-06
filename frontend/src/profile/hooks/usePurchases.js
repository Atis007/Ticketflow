import { useQuery } from "@tanstack/react-query";

import { getPurchases } from "../profile.api";

export function usePurchases(token, enabled = true) {
  return useQuery({
    queryKey: ["profile", "purchases", token],
    enabled: Boolean(enabled && token),
    queryFn: async () => {
      const response = await getPurchases(token);
      return response?.purchases ?? [];
    },
    staleTime: 60 * 1000,
  });
}
