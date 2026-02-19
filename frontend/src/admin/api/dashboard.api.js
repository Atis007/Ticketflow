import { request } from "./http";

export function getHealthSummary({ token, signal }) {
  return request("admin/health/summary", { token, signal });
}

export function getSyncChanges({ token, since, signal }) {
  return request("admin/sync/changes", {
    token,
    signal,
    query: { since },
  });
}
