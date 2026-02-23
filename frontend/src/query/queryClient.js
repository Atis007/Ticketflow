import { QueryClient } from "@tanstack/react-query";

function shouldRetry(failureCount, error) {
  const status = error?.status;

  if (typeof status === "number" && status >= 400 && status < 500 && status !== 429) {
    return false;
  }

  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 120 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: shouldRetry,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
