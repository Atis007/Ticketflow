import { useQuery } from "@tanstack/react-query";

const SAMPLE_PURCHASES = [
  {
    id: "ord-1",
    eventName: "Neon Nights Music Festival",
    eventDate: "2026-05-18T19:30:00Z",
    quantity: 2,
    ticketType: "VIP",
    status: "paid",
  },
  {
    id: "ord-2",
    eventName: "Tech Future Summit",
    eventDate: "2026-06-03T09:00:00Z",
    quantity: 1,
    ticketType: "Early Bird",
    status: "pending",
  },
];

export function usePurchases(enabled = true) {
  return useQuery({
    queryKey: ["profile", "purchases"],
    enabled,
    queryFn: async () => SAMPLE_PURCHASES,
    staleTime: 60 * 1000,
  });
}
