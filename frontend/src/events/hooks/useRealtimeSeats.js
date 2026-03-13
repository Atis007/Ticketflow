import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";
import { eventsKeys } from "../events.queryKeys";

function recalcSummary(seats) {
  return {
    available: seats.filter((s) => s.status === "available").length,
    sold: seats.filter((s) => s.status === "sold").length,
  };
}

function applyRealtimeChange(old, payload) {
  const { eventType, new: newRow, old: oldRow } = payload;
  let seats = old.seats ?? [];

  if (eventType === "UPDATE") {
    seats = seats.map((s) =>
      s.id === newRow.id ? { ...s, status: newRow.status } : s
    );
  } else if (eventType === "INSERT") {
    const seat = {
      id: newRow.id,
      rowLabel: newRow.row_label,
      seatNumber: newRow.seat_number,
      sectionId: newRow.section_id ?? null,
      sectionName: newRow.section_name ?? null,
      status: newRow.status,
    };
    seats = [...seats, seat];
  } else if (eventType === "DELETE") {
    seats = seats.filter((s) => s.id !== oldRow.id);
  }

  return { ...old, seats, summary: recalcSummary(seats) };
}

export function useRealtimeSeats(eventId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`seats-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_seats",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          queryClient.setQueryData(eventsKeys.seats(eventId), (old) => {
            if (!old) return old;
            return applyRealtimeChange(old, payload);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);
}
