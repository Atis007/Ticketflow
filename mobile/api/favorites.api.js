import http from "./http";

export async function getFavorites({ page = 1, pageSize = 20 } = {}) {
  return http.get("profile/favorites", { params: { page, pageSize } });
}

export async function addFavorite(eventId) {
  return http.post(`favorites/${eventId}`);
}

export async function removeFavorite(eventId) {
  return http.delete(`favorites/${eventId}`);
}
