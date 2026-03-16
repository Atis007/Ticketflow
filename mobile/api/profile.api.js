import http from "./http";

export async function getPurchases({ page = 1, pageSize = 20 } = {}) {
  return http.get("profile/purchases", { params: { page, pageSize } });
}
