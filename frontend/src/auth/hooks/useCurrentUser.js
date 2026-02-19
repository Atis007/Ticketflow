import { useQuery } from "@tanstack/react-query";

import { currentUserService } from "../util/auth.service";

export function useCurrentUser(token) {
  return useQuery({
    queryKey: ["auth", "currentUser"],
    enabled: Boolean(token),
    retry: false,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!token) {
        return null;
      }

      const response = await currentUserService(token);
      return response?.data?.user ?? null;
    },
  });
}
