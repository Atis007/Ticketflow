import { request } from "./http";

export function sendAiChat({ token, messages, conversationId, signal }) {
  return request("admin/ai/chat", {
    token,
    signal,
    method: "POST",
    body: { messages, ...(conversationId ? { conversationId } : {}) },
  });
}

export function getAiHistory({ token, page = 1, pageSize = 20, signal }) {
  return request("admin/ai/history", {
    token,
    signal,
    query: { page, pageSize },
  });
}
