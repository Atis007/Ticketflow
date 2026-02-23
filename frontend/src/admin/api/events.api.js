import { request } from "./http";

export function getAdminEvents({ token, page = 1, pageSize = 20, search, isActive, categoryId, sortBy, sortDir, signal }) {
  return request("admin/events", {
    token,
    signal,
    query: {
      page,
      pageSize,
      search,
      isActive,
      categoryId,
      sortBy,
      sortDir,
    },
  });
}

export function toggleEventActive({ token, id }) {
  return request(`admin/events/${id}/toggle-active`, {
    token,
    method: "PATCH",
  });
}

export function getEventById({ token, id, signal }) {
  return request(`events/${id}`, {
    token,
    signal,
  });
}

export function createEvent({ token, payload, signal }) {
  return request("events", {
    token,
    signal,
    method: "POST",
    body: payload,
  });
}

export function updateEventPut({ token, id, payload, signal }) {
  return request(`events/${id}`, {
    token,
    signal,
    method: "PUT",
    body: payload,
  });
}

export function updateEventPatch({ token, id, payload, signal }) {
  return request(`events/${id}`, {
    token,
    signal,
    method: "PATCH",
    body: payload,
  });
}
