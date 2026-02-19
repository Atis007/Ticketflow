const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api/";

function normalizeBaseUrl(value) {
  if (!value) {
    return "/";
  }

  if (/^https?:\/\//i.test(value)) {
    return value.endsWith("/") ? value : `${value}/`;
  }

  return value.endsWith("/") ? value : `${value}/`;
}

const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

export function buildUrl(path, query) {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, normalizedBaseUrl.startsWith("http") ? normalizedBaseUrl : new URL(normalizedBaseUrl, window.location.origin));

  if (query && typeof query === "object") {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }

      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

function parseJsonSafe(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function createHttpError(status, message, details = null) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
}

export async function request(path, { method = "GET", body, query, token, signal } = {}) {
  const hasBody = body !== undefined;

  const response = await fetch(buildUrl(path, query), {
    method,
    signal,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
  });

  const raw = await response.text();
  const payload = parseJsonSafe(raw);

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed with ${response.status}`;
    throw createHttpError(response.status, message, payload);
  }

  if (payload && payload.success === false) {
    const message = payload.error || "Request failed";
    throw createHttpError(response.status, message, payload);
  }

  if (payload && Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data;
  }

  return payload;
}
