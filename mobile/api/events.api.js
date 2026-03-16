import http from "./http";

export async function getEvents({ page = 1, pageSize = 20 } = {}) {
  return http.get("api/events", { params: { page, pageSize } });
}

export async function getEventById(id) {
  return http.get(`api/events/${id}`);
}

export async function searchEvents({ page = 1, pageSize = 20, category, city, month } = {}) {
  const params = { page, pageSize };
  if (category) params.category = category;
  if (city) params.city = city;
  if (month) params.month = month;
  return http.get("api/events", { params });
}

export async function getCategories() {
  return http.get("api/categories");
}

export async function getEventSeats(eventId) {
  return http.get(`api/events/${eventId}/seats`);
}

export async function reserveSeats(eventId, seatIds) {
  return http.post(`api/events/${eventId}/seats/reserve`, { seatIds });
}
