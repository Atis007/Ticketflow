import { useMutation } from "@tanstack/react-query";

import { simulatePurchase } from "../purchases.api";

export function useSimulatePurchase() {
  return useMutation({
    mutationFn: async (payload) => simulatePurchase({
      ...payload,
      idempotencyKey: payload.idempotencyKey ?? crypto.randomUUID(),
    }),
  });
}
