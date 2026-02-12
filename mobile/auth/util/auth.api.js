import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const baseUrl = Constants.expoConfig?.extra?.API_BASE_URL || "";

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    if (data && typeof data.success === "boolean") {
      return data;
    }

    return {
      success: false,
      error: data?.message || data?.error || `Request failed with ${response.status}`,
      data: null,
    };
  }

  if (data && typeof data.success === "boolean") {
    return data;
  }

  return {
    success: true,
    data,
    error: null,
  };
}

export async function login(payload) {
  const response = await fetch(`${baseUrl}auth/user/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function register(payload) {
  const response = await fetch(`${baseUrl}auth/user/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  
  return handleResponse(response);
}

export async function loginAdmin(payload) {
  const response = await fetch(`${baseUrl}auth/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function forgotPassword(email) {
  const response = await fetch(`${baseUrl}auth/user/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  // Do not leak existence; just ensure request was accepted
  if (!response.ok) {
    throw new Error("Failed to send forgot password email");
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
