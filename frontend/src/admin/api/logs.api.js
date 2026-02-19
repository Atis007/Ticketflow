import { request } from "./http";

export function getDeviceLogs({ token, page = 1, pageSize = 20, search, signal }) {
  return request("admin/logs/device", {
    token,
    signal,
    query: { page, pageSize, search },
  });
}

export function getAdminLogs({ token, page = 1, pageSize = 20, search, signal }) {
  return request("admin/logs/admin", {
    token,
    signal,
    query: { page, pageSize, search },
  });
}

export function getEventChangeLogs({ token, page = 1, pageSize = 20, search, signal }) {
  return request("admin/logs/event-changes", {
    token,
    signal,
    query: { page, pageSize, search },
  });
}
