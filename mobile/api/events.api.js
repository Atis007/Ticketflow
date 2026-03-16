import http from "./http";

export async function getEvents({ page = 1, pageSize = 20 } = {}) {
  return http.get("events", { params: { page, pageSize } });
}

export async function getEventById(id) {
  return http.get(`events/${id}`);
}

export async function searchEvents({ page = 1, pageSize = 20, category, city, month } = {}) {
  const params = { page, pageSize };
  if (category) params.category = category;
  if (city) params.city = city;
  if (month) params.month = month;
  return http.get("events", { params });
}

export async function getCategories() {
  return http.get("categories");
}

export async function getEventSeats(eventId) {
  return http.get(`events/${eventId}/seats`);
}

export async function reserveSeats(eventId, seatIds) {
  return http.post(`events/${eventId}/seats/reserve`, { seatIds });
}
