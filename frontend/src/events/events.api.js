const baseUrl = import.meta.env.VITE_API_BASE_URL;

function endpoint(path) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  return `${normalizedBase}${normalizedPath}`;
}

async function handleResponse(response) {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return response.json().catch(() => ({}));
}

export async function getEventsByCategorySlug(categorySlug) {
  const response = await fetch(endpoint(`events/${encodeURIComponent(categorySlug)}`), {
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
