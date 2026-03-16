import http from "./http";

export async function getEventTickets(eventId) {
  return http.get(`api/checkin/event/${eventId}/tickets`);
}

export async function syncScans(scans) {
  return http.post("api/checkin/sync", scans);
}
