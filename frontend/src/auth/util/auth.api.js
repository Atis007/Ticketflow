const baseUrl = import.meta.env.VITE_API_BASE_URL;

function endpoint(path) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  return `${normalizedBase}${normalizedPath}`;
}

async function handleResponse(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  if (payload && payload.success === false) {
    throw new Error(payload.error || "Request failed");
  }

  return payload || {};
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

  return handleResponse(response);
}

export async function resetPassword(payload) {
  const response = await fetch(endpoint("auth/reset-password"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function sendVerification(token) {
  const response = await fetch(endpoint("auth/verify-email/send"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return handleResponse(response);
}

export async function resendVerification(token) {
  const response = await fetch(endpoint("auth/verify-email/resend"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return handleResponse(response);
}

export async function confirmVerification(token) {
  const response = await fetch(endpoint("auth/verify-email/confirm"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  return handleResponse(response);
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
