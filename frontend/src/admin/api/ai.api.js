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

export function getEvalResults({ token, page = 1, pageSize = 20, eventId, evalName, status, signal }) {
  return request("ai/eval-results", {
    token,
    signal,
    query: {
      page,
      pageSize,
      ...(eventId ? { event_id: eventId } : {}),
      ...(evalName ? { eval_name: evalName } : {}),
      ...(status ? { status } : {}),
    },
  });
}

export function enhanceContent({ token, title, description, signal }) {
  return request("ai/enhance-content", {
    token,
    signal,
    method: "POST",
    body: { title, description },
  });
}
