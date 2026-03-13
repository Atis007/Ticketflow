import { useMutation } from "@tanstack/react-query";
import { reserveSeats } from "../events.api";

export function useReserveSeat(eventId) {
  return useMutation({
    mutationFn: ({ seatIds, token }) => reserveSeats(eventId, seatIds, token),
  });
}
