export const eventsKeys = {
  all: ["events"],
  detail: (id) => ["events", id],
  seats: (eventId) => ["events", "seats", eventId],
};
