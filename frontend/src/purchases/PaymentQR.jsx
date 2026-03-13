import { QRCodeSVG } from "qrcode.react";

import { useAuth } from "@/auth/context/AuthContext";
import { useConfirmPayment } from "@/purchases/hooks/useConfirmPayment";

export default function PaymentQR({ ipsQrPayload, paymentId, onConfirmed }) {
  const { token } = useAuth();
  const confirmPayment = useConfirmPayment();

  const handleConfirm = async () => {
    if (!paymentId || !token) return;
    try {
      await confirmPayment.mutateAsync({ token, paymentId });
      onConfirmed?.();
    } catch {
      // error displayed below
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-background-dark p-4 flex flex-col items-center gap-3">
      <p className="text-xs text-text-muted text-center">
        IPS Payment QR — scan with your banking app
      </p>
      <QRCodeSVG
        value={ipsQrPayload}
        size={200}
        bgColor="transparent"
        fgColor="#ffffff"
        level="M"
      />
      <p className="text-[10px] text-text-muted text-center">
        Scan with your banking app to complete payment
      </p>

      {confirmPayment.isError && (
        <p className="text-xs text-red-400 text-center">
          {confirmPayment.error?.message || "Confirmation failed. Try again."}
        </p>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={confirmPayment.isPending}
        className="inline-flex h-10 items-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
      >
        {confirmPayment.isPending ? "Confirming..." : "I've paid"}
      </button>
    </div>
  );
}
