import { request } from "./http";

export function enhanceContent({ token, title, description, signal }) {
  return request("ai/enhance-content", {
    token,
    signal,
    method: "POST",
    body: { title, description },
  });
}
