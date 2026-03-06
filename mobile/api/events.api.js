import Constants from "expo-constants";

const baseUrl = Constants.expoConfig?.extra?.API_BASE_URL || "";

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  if (data && data.success === false) {
    throw new Error(data.error || "Request failed");
  }

  if (data && Object.prototype.hasOwnProperty.call(data, "data")) {
    return data.data;
  }

  return data;
}

export async function getEvents({ page = 1, pageSize = 20 } = {}) {
  const url = `${baseUrl}api/events?page=${page}&pageSize=${pageSize}`;
  const response = await fetch(url);
  return handleResponse(response);
}

export async function getEventById(id) {
  const response = await fetch(`${baseUrl}api/events/${id}`);
  return handleResponse(response);
}
