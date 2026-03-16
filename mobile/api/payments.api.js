import http from "./http";

export async function createPayment({ eventId, quantity, currency = "RSD", seatIds, idempotencyKey }) {
  const body = {
    event_id: eventId,
    currency,
    idempotency_key: idempotencyKey,
  };

  if (seatIds && seatIds.length > 0) {
    body.seat_ids = seatIds;
  } else {
    body.quantity = quantity;
  }

  return http.post("api/payments", body);
}

export async function getPayment(paymentId) {
  return http.get(`api/payments/${paymentId}`);
}

export async function confirmPayment(paymentId) {
  return http.post(`api/payments/${paymentId}/confirm`);
}
