import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL || "";

// Auth API uses a raw axios instance (no auth interceptor, no auto-unwrap)
// because login/register happen before a token exists and callers
// expect the full { success, data, error } response shape.
const authHttp = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "X-Platform": "mobile",
    Host: "ticketflow-local",
  },
});

async function handleResponse(response) {
  const data = response.data;

  if (data && typeof data.success === "boolean") {
    return data;
  }

  return { success: true, data, error: null };
}

function handleError(error) {
  const data = error.response?.data;

  if (data && typeof data.success === "boolean") {
    return data;
  }

  return {
    success: false,
    error: data?.message || data?.error || error.message || "Network error",
    data: null,
  };
}

export async function login(payload) {
  try {
    const response = await authHttp.post("auth/user/login", payload);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
}

export async function register(payload) {
  try {
    const response = await authHttp.post("auth/user/register", payload);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
}

export async function loginAdmin(payload) {
  try {
    const response = await authHttp.post("auth/admin/login", payload);
    return handleResponse(response);
  } catch (error) {
    return handleError(error);
  }
}

export async function forgotPassword(email) {
  try {
    await authHttp.post("auth/forgot-password", { email });
  } catch {
    throw new Error("Failed to send forgot password email");
  }
}

export async function logout(token) {
  try {
    await authHttp.post("auth/logout", null, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // fire-and-forget
  }
}

const TOKEN_KEY = "auth_token";
const EXPIRATION_KEY = "auth_expiration";

export function getTokenDuration() {
  return AsyncStorage.getItem(EXPIRATION_KEY).then((storedExpiration) => {
    if (!storedExpiration) return -1;

    const expirationDate = new Date(storedExpiration);
    const now = new Date();
    return expirationDate.getTime() - now.getTime();
  });
}

export async function getAuthToken() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);

  if (!token) {
    return null;
  }

  const tokenDuration = await getTokenDuration();

  if (tokenDuration <= 0) {
    return "EXPIRED";
  }

  return token;
}

export async function setAuthToken(token, expirationDate) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(EXPIRATION_KEY, expirationDate.toISOString());
}

export async function clearAuthToken() {
  await AsyncStorage.multiRemove([TOKEN_KEY, EXPIRATION_KEY]);
}
