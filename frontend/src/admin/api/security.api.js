import { request } from "./http";

export function getIncidents({ token, page = 1, pageSize = 20, status, search, signal }) {
  return request("admin/security/incidents", {
    token,
    signal,
    query: { page, pageSize, status, search },
  });
}

export function getBlocks({ token, page = 1, pageSize = 20, search, signal }) {
  return request("admin/security/blocks", {
    token,
    signal,
    query: { page, pageSize, search },
  });
}

export function createIpBlock({ token, payload }) {
  return request("admin/security/blocks/ip", {
    token,
    method: "POST",
    body: payload,
  });
}

export function liftBlock({ token, id }) {
  return request(`admin/security/blocks/${id}/lift`, {
    token,
    method: "POST",
  });
}

export function escalateIncident({ token, id }) {
  return request(`admin/security/incidents/${id}/escalate`, {
    token,
    method: "POST",
  });
}

export function resolveIncident({ token, id }) {
  return request(`admin/security/incidents/${id}/resolve`, {
    token,
    method: "POST",
  });
}
