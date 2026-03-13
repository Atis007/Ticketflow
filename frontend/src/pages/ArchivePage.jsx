import { Link } from "react-router-dom";

import AsyncState from "@/components/AsyncState";
import { useAuth } from "@/auth/context/AuthContext";
import { usePurchases } from "@/profile/hooks/usePurchases";
import PurchasesList from "@/profile/components/PurchasesList";

export default function ArchivePage() {
  const { token, isAuthenticated, isVerified } = useAuth();
  const purchasesQuery = usePurchases(token, isAuthenticated && isVerified);

  const now = new Date();
  const archived = (purchasesQuery.data ?? []).filter(
    (p) => p.status === "paid" && new Date(p.eventDate) < now,
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-2 pt-6 pb-10 sm:px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Archive</h1>
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to profile
        </Link>
      </div>

      {!isVerified && (
        <AsyncState message="Please verify your email to view your archive." />
      )}
      {isVerified && purchasesQuery.isPending && <AsyncState message="Loading archive..." />}
      {isVerified && purchasesQuery.isError && (
        <AsyncState
          type="error"
          message={purchasesQuery.error?.message || "Failed to load archive."}
          onRetry={() => purchasesQuery.refetch()}
        />
      )}

      {isVerified && !purchasesQuery.isPending && !purchasesQuery.isError && (
        <PurchasesList items={archived} />
      )}
    </div>
  );
}
