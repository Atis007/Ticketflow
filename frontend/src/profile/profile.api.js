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

export async function getPurchases(token) {
  const response = await fetch(endpoint("profile/purchases"), {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return handleResponse(response);
}

export async function uploadAvatar(token, file) {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await fetch(endpoint("profile/avatar"), {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  return handleResponse(response);
}

export async function getFavorites(token) {
  const response = await fetch(endpoint("profile/favorites"), {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return handleResponse(response);
}

export async function updateProfile(token, { fullname }) {
  const response = await fetch(endpoint("profile/me"), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ fullname }),
  });

  return handleResponse(response);
}

export async function changePassword(token, { currentPassword, newPassword }) {
  const response = await fetch(endpoint("profile/password"), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  return handleResponse(response);
}

export async function addFavorite(token, eventId) {
  const response = await fetch(endpoint(`favorites/${encodeURIComponent(eventId)}`), {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return handleResponse(response);
}

export async function removeFavorite(token, eventId) {
  const response = await fetch(endpoint(`favorites/${encodeURIComponent(eventId)}`), {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return handleResponse(response);
}
