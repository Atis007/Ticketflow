import { useNavigate, useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";

import AsyncState from "@/components/AsyncState";
import { useAuth } from "@/auth/context/AuthContext";
import { useFavorites } from "@/profile/hooks/useFavorites";
import { usePurchases } from "@/profile/hooks/usePurchases";
import ProfileHeader from "@/profile/components/ProfileHeader";
import ProfileSection from "@/profile/components/ProfileSection";
import PurchasesList from "@/profile/components/PurchasesList";
import FavoritesList from "@/profile/components/FavoritesList";
import QuickActions from "@/profile/components/QuickActions";
import { updateProfile, changePassword } from "@/profile/profile.api";

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isVerified, token, user, logout, resendVerification } = useAuth();

  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.hash]);
  const [loggingOut, setLoggingOut] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState(null);
  const [verificationError, setVerificationError] = useState(null);
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  const favoritesQuery = useFavorites(token, isAuthenticated && isVerified);
  const purchasesQuery = usePurchases(token, isAuthenticated && isVerified);

  const [nameValue, setNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => {
    if (user) setNameValue(user.fullName || user.fullname || user.name || "");
  }, [user]);

  async function handleNameSave(e) {
    e.preventDefault();
    const trimmed = nameValue.trim();
    if (!trimmed) return;
    setNameSaving(true);
    setNameError(null);
    setNameSuccess(false);
    try {
      await updateProfile(token, { fullname: trimmed });
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err) {
      setNameError(err.message || "Failed to update name.");
    } finally {
      setNameSaving(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setPwError("New passwords do not match.");
      return;
    }
    if (pwForm.next.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    setPwSaving(true);
    setPwError(null);
    setPwSuccess(false);
    try {
      await changePassword(token, { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwSuccess(true);
      setPwForm({ current: "", next: "", confirm: "" });
      setPwOpen(false);
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err) {
      setPwError(err.message || "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/");
    } finally {
      setLoggingOut(false);
    }
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
      <ProfileHeader user={user} onLogout={handleLogout} loggingOut={loggingOut} />

      <div className="flex flex-wrap gap-2">
        <Link
          to="/dashboard/tickets"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-text-soft transition-colors hover:border-primary hover:text-primary"
        >
          <span className="material-symbols-outlined text-base">confirmation_number</span>
          My Tickets
        </Link>
        <Link
          to="/dashboard/archive"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-text-soft transition-colors hover:border-primary hover:text-primary"
        >
          <span className="material-symbols-outlined text-base">archive</span>
          Archive
        </Link>
      </div>

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
          <ProfileSection id="account" title="Account Settings">
            <form onSubmit={handleNameSave} className="space-y-3">
              <label className="block text-sm font-semibold text-text-soft">Display Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  maxLength={100}
                  className="flex-1 rounded-lg border border-white/10 bg-surface-mid px-3 py-2 text-sm text-white placeholder-text-muted focus:border-primary/50 focus:outline-none transition-colors"
                  placeholder="Your display name"
                />
                <button
                  type="submit"
                  disabled={nameSaving || !nameValue.trim()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {nameSaving ? "Saving..." : "Save"}
                </button>
              </div>
              {nameError ? <p className="text-xs text-danger">{nameError}</p> : null}
              {nameSuccess ? <p className="text-xs text-accent-green">Name updated.</p> : null}
            </form>

            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-soft">Password</span>
                <button
                  type="button"
                  onClick={() => { setPwOpen((v) => !v); setPwError(null); }}
                  className="text-sm text-primary hover:text-accent-cyan transition-colors"
                >
                  {pwOpen ? "Cancel" : "Change password"}
                </button>
              </div>
              {pwSuccess ? <p className="mt-2 text-xs text-accent-green">Password changed successfully.</p> : null}
              {pwOpen ? (
                <form onSubmit={handlePasswordChange} className="mt-3 space-y-3">
                  <input
                    type="password"
                    placeholder="Current password"
                    value={pwForm.current}
                    onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-surface-mid px-3 py-2 text-sm text-white placeholder-text-muted focus:border-primary/50 focus:outline-none transition-colors"
                    required
                  />
                  <input
                    type="password"
                    placeholder="New password (min 8 characters)"
                    value={pwForm.next}
                    onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-surface-mid px-3 py-2 text-sm text-white placeholder-text-muted focus:border-primary/50 focus:outline-none transition-colors"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-surface-mid px-3 py-2 text-sm text-white placeholder-text-muted focus:border-primary/50 focus:outline-none transition-colors"
                    required
                  />
                  {pwError ? <p className="text-xs text-danger">{pwError}</p> : null}
                  <button
                    type="submit"
                    disabled={pwSaving}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {pwSaving ? "Saving..." : "Update password"}
                  </button>
                </form>
              ) : null}
            </div>
          </ProfileSection>

          <ProfileSection id="favorites" title="Favorites">
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
