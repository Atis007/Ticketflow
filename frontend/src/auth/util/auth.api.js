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

export async function login(payload) {
  const response = await fetch(endpoint("auth/user/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function register(payload) {
  const response = await fetch(endpoint("auth/user/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function loginAdmin(payload) {
  const response = await fetch(endpoint("auth/admin/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function forgotPassword(email) {
  const response = await fetch(endpoint("auth/forgot-password"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  // do not leak existence; just ensure request was accepted
  if (!response.ok) {
    throw new Error("Failed to send forgot password email");
  }
}

export async function logout(token) {
  const response = await fetch(endpoint("auth/logout"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return handleResponse(response);
}

export async function currentUser(token) {
  const response = await fetch(endpoint("auth/me"), {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return handleResponse(response);
}
