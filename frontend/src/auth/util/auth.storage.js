export const AUTH_STORAGE_KEY = "ticketflow.auth.v1";

function normalizeExpiresAt(expiresAt) {
  if (typeof expiresAt !== "string" || expiresAt.trim() === "") {
    return null;
  }

  return expiresAt.trim();
}

function normalizeUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const role = typeof user.role === "string" ? user.role.toLowerCase() : "";

  return {
    ...user,
    role,
  };
}

function parseDateMs(expiresAt) {
  if (!expiresAt) {
    return NaN;
  }

  const direct = Date.parse(expiresAt);
  if (!Number.isNaN(direct)) {
    return direct;
  }

  const withT = Date.parse(expiresAt.replace(" ", "T"));
  if (!Number.isNaN(withT)) {
    return withT;
  }

  return NaN;
}

export function isExpired(expiresAt) {
  const expiryMs = parseDateMs(expiresAt);

  if (Number.isNaN(expiryMs)) {
    return true;
  }

  return Date.now() >= expiryMs;
}

export function readStoredAuth() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    const token = typeof parsed?.token === "string" ? parsed.token : null;
    const expiresAt = normalizeExpiresAt(parsed?.expiresAt);
    const user = normalizeUser(parsed?.user);

    if (!token || !expiresAt || !user) {
      return null;
    }

    return {
      token,
      expiresAt,
      user,
    };
  } catch {
    return null;
  }
}

export function writeStoredAuth(session) {
  const token = typeof session?.token === "string" ? session.token : null;
  const expiresAt = normalizeExpiresAt(session?.expiresAt);
  const user = normalizeUser(session?.user);

  if (!token || !expiresAt || !user) {
    return;
  }

  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      token,
      expiresAt,
      user,
    }),
  );
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
