import { request } from "./http";

export function getAnalyticsSales({ token, days = 30, signal }) {
  return request("admin/analytics/sales", {
    token,
    signal,
    query: { days },
  });
}
