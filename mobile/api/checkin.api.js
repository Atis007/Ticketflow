import http from "./http";

export async function getEventTickets(eventId) {
  return http.get(`checkin/event/${eventId}/tickets`);
}

export async function syncScans(scans) {
  return http.post("checkin/sync", scans);
}
