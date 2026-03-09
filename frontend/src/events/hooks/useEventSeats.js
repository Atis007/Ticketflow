import { useQuery } from "@tanstack/react-query";

import { getEventSeats } from "../events.api";
import { eventsKeys } from "../events.queryKeys";

export function useEventSeats(eventId, enabled = true) {
  return useQuery({
    queryKey: eventsKeys.seats(eventId),
    queryFn: () => getEventSeats(eventId),
    enabled: Boolean(eventId && enabled),
    staleTime: 30_000,
  });
}
