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

export async function simulatePurchase({ token, eventId, quantity, simulateOutcome, currency, idempotencyKey, seatIds }) {
  const response = await fetch(endpoint("purchases/simulate"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      eventId,
      quantity,
      simulateOutcome,
      currency,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      ...(seatIds?.length ? { seatIds } : {}),
    }),
  });

  return handleResponse(response);
}

export async function confirmPayment({ token, paymentId }) {
  const response = await fetch(endpoint(`payments/${paymentId}/confirm`), {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return handleResponse(response);
}
