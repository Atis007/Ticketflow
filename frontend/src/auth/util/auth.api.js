import { redirect } from "react-router-dom";

const baseUrl = import.meta.env.VITE_API_BASE_URL;

async function handleResponse(response) {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return response.json().catch(() => ({}));
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

  // do not leak existence; just ensure request was accepted
  if (!response.ok) {
    throw new Error("Failed to send forgot password email");
  }
}

export function getTokenDuration() {
  const storedExpiration = localStorage.getItem("expiration");
  const expirationDate = new Date(storedExpiration);
  const now = new Date();
  const duration = expirationDate.getTime() - now.getTime(); //getting the difference in milliseconds
  // if duration is negative, or maybe 0 the token has expired, so we can remove it from local storage,
  // and the user will be logged out
  return duration;
}

export function getAuthToken() {
  const token = localStorage.getItem("token");

  // no token, user not logged in, return null
  if (!token) {
    return null;
  }

  const tokenDuration = getTokenDuration();

  // had a token, but time is up
  if (tokenDuration <= 0) {
    return "EXPIRED";
  }

  return token;
}

export function tokenLoader() {
  return getAuthToken();
}

export function checkAuthLoader() {
  const token = getAuthToken();

  if (!token) {
    return redirect("/login"); //user not logged in-> redirect to auth page
  }

  return null; //user logged in-> allow access to the route
}
