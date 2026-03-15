const baseUrl = import.meta.env.VITE_API_BASE_URL;

function endpoint(path) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  return `${normalizedBase}${normalizedPath}`;
}

async function handleResponse(response) {
  const raw = await response.text().catch(() => "");
  let payload = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  if (payload && payload.success === false) {
    throw new Error(payload.error || "Request failed");
  }

  if (payload && Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data;
  }

  return payload || {};
}

export async function getEvents({ page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const response = await fetch(endpoint(`events?${params.toString()}`), {
    method: "GET",
  });

  return handleResponse(response);
}

export async function getEventsByCategorySlug(categorySlug, { page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const response = await fetch(endpoint(`events/${encodeURIComponent(categorySlug)}?${params.toString()}`), {
    method: "GET",
  });

  return handleResponse(response);
}

export async function getEventDetailsByCategorySlug(categorySlug, eventSlug) {
  const response = await fetch(endpoint(`events/${encodeURIComponent(categorySlug)}/${encodeURIComponent(eventSlug)}`), {
    method: "GET",
  });

  return handleResponse(response);
}

export async function getEventById(id) {
  const response = await fetch(endpoint(`events/${encodeURIComponent(id)}`), {
    method: "GET",
  });

  return handleResponse(response);
}

export async function getEventSeats(eventId) {
  const response = await fetch(endpoint(`events/${encodeURIComponent(eventId)}/seats`), {
    method: "GET",
  });

  return handleResponse(response);
}

export async function getCategories() {
  const response = await fetch(endpoint("categories"), {
    method: "GET",
  });

  return handleResponse(response);
}

export async function createEvent(token, formData) {
  const response = await fetch(endpoint("events"), {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  return handleResponse(response);
}

export async function updateEvent(token, id, formData) {
  const response = await fetch(endpoint(`events/${encodeURIComponent(id)}`), {
    method: "PUT",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  return handleResponse(response);
}

export async function generateLayoutPreview(token, { venueName, venueType, capacity, instructions }) {
  const response = await fetch(endpoint("ai/generate-layout-preview"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ venueName, venueType, capacity, instructions }),
  });

  return handleResponse(response);
}

export async function reserveSeats(eventId, seatIds, token) {
  const response = await fetch(endpoint(`events/${encodeURIComponent(eventId)}/seats/reserve`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ seatIds }),
  });
  return handleResponse(response);
}
