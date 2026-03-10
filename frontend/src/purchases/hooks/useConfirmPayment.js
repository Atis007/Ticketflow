import { useMutation } from "@tanstack/react-query";

import { confirmPayment } from "../purchases.api";

export function useConfirmPayment() {
  return useMutation({
    mutationFn: confirmPayment,
  });
}
