import { useNavigate } from "react-router-dom";
import { useState } from "react";

import AsyncState from "@/components/AsyncState";
import { useAuth } from "@/auth/context/AuthContext";
import { useFavorites } from "@/profile/hooks/useFavorites";
import { usePurchases } from "@/profile/hooks/usePurchases";
import ProfileHeader from "@/profile/components/ProfileHeader";
import ProfileSection from "@/profile/components/ProfileSection";
import PurchasesList from "@/profile/components/PurchasesList";
import FavoritesList from "@/profile/components/FavoritesList";
import QuickActions from "@/profile/components/QuickActions";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isAuthenticated, isVerified, token, user, logout, resendVerification } = useAuth();
  const [verificationMessage, setVerificationMessage] = useState(null);
  const [verificationError, setVerificationError] = useState(null);
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  const favoritesQuery = useFavorites(token, isAuthenticated && isVerified);
  const purchasesQuery = usePurchases(token, isAuthenticated && isVerified);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleResendVerification = async () => {
    setVerificationMessage(null);
    setVerificationError(null);
    setIsSendingVerification(true);

    try {
      const response = await resendVerification();
      if (response?.success) {
        setVerificationMessage(response?.data?.message || "Verification email sent.");
      } else {
        setVerificationError(response?.error || "Failed to send verification email.");
      }
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : "Failed to send verification email.");
    } finally {
      setIsSendingVerification(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-2 pt-4 pb-6 sm:px-4 lg:px-6">
      <ProfileHeader user={user} onLogout={handleLogout} />

      {!isVerified ? (
        <ProfileSection title="Email Verification Required">
          <AsyncState message="Verify your email to unlock event details, favorites, and purchases." />
          {verificationMessage ? <AsyncState message={verificationMessage} className="mt-3" /> : null}
          {verificationError ? <AsyncState type="error" message={verificationError} className="mt-3" /> : null}
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isSendingVerification}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-color-hover"
            >
              Resend verification email
              {isSendingVerification ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span> : null}
            </button>
            <button
              type="button"
              onClick={() => navigate("/verify-email")}
              className="inline-flex h-10 items-center rounded-full border border-white/20 px-4 text-sm font-semibold text-text-soft transition-colors hover:border-primary hover:text-primary"
            >
              Open verification page
            </button>
          </div>
        </ProfileSection>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <ProfileSection title="Purchases">
            {!isVerified ? <AsyncState message="Purchases are available after email verification." /> : null}
            {isVerified && purchasesQuery.isPending ? <AsyncState message="Loading purchases..." /> : null}
            {isVerified && purchasesQuery.isError ? <AsyncState type="error" message={purchasesQuery.error?.message || "Failed to load purchases."} onRetry={() => purchasesQuery.refetch()} /> : null}
            {isVerified && !purchasesQuery.isPending && !purchasesQuery.isError ? <PurchasesList items={purchasesQuery.data || []} /> : null}
          </ProfileSection>

          <ProfileSection title="Quick Actions">
            <QuickActions />
          </ProfileSection>
        </div>

        <div className="space-y-6">
          <ProfileSection title="Favorites">
            {!isVerified ? <AsyncState message="Favorites are available after email verification." /> : null}
            {isVerified && favoritesQuery.isPending ? <AsyncState message="Loading favorites..." /> : null}
            {isVerified && favoritesQuery.isError ? <AsyncState type="error" message={favoritesQuery.error?.message || "Failed to load favorites."} onRetry={() => favoritesQuery.refetch()} /> : null}
            {isVerified && !favoritesQuery.isPending && !favoritesQuery.isError ? <FavoritesList items={favoritesQuery.data || []} /> : null}
          </ProfileSection>
        </div>
      </div>
    </div>
  );
}
