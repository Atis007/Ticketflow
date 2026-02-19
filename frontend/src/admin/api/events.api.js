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
