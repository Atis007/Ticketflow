import { request } from "./http";

export function getDeviceLogs({
  token,
  page = 1,
  pageSize = 20,
  search,
  action,
  ip,
  device_type,
  platform,
  outcome,
  dateFrom,
  dateTo,
  signal,
}) {
  return request("admin/logs/device", {
    token,
    signal,
    query: {
      page,
      pageSize,
      search,
      action,
      ip,
      device_type,
      platform,
      outcome,
      dateFrom,
      dateTo,
    },
  });
}

export function getAdminLogs({
  token,
  page = 1,
  pageSize = 20,
  search,
  action,
  outcome,
  dateFrom,
  dateTo,
  signal,
}) {
  return request("admin/logs/admin", {
    token,
    signal,
    query: {
      page,
      pageSize,
      search,
      action,
      outcome,
      dateFrom,
      dateTo,
    },
  });
}

export function getEventChangeLogs({
  token,
  page = 1,
  pageSize = 20,
  search,
  field,
  dateFrom,
  dateTo,
  signal,
}) {
  return request("admin/logs/event-changes", {
    token,
    signal,
    query: {
      page,
      pageSize,
      search,
      field,
      dateFrom,
      dateTo,
    },
  });
}
