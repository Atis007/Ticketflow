import { request } from "./http";

export function getUsers({ token, page = 1, pageSize = 20, search, role, isDisabled, signal }) {
  return request("admin/users", {
    token,
    signal,
    query: {
      page,
      pageSize,
      search,
      role,
      isDisabled,
    },
  });
}

export function getUser({ token, id, signal }) {
  return request(`admin/users/${id}`, { token, signal });
}

export function createUser({ token, payload }) {
  return request("admin/users", {
    token,
    method: "POST",
    body: payload,
  });
}

export function updateUser({ token, id, payload }) {
  return request(`admin/users/${id}`, {
    token,
    method: "PUT",
    body: payload,
  });
}

export function deleteUser({ token, id }) {
  return request(`admin/users/${id}`, {
    token,
    method: "DELETE",
  });
}

export function disableUser({ token, id, payload }) {
  return request(`admin/users/${id}/disable`, {
    token,
    method: "PATCH",
    body: payload,
  });
}

export function enableUser({ token, id }) {
  return request(`admin/users/${id}/enable`, {
    token,
    method: "PATCH",
  });
}

export function bulkDisableUsers({ token, payload }) {
  return request("admin/users/bulk-disable", {
    token,
    method: "PATCH",
    body: payload,
  });
}

export function bulkEnableUsers({ token, payload }) {
  return request("admin/users/bulk-enable", {
    token,
    method: "PATCH",
    body: payload,
  });
}
