import { useMutation } from "@tanstack/react-query";
import { reserveSeats } from "../api/events.api";

export function useReserveSeat(eventId) {
  return useMutation({
    mutationFn: (seatIds) => reserveSeats(eventId, seatIds),
  });
}
