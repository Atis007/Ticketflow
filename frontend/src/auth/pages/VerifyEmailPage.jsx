import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useAuth } from "@/auth/context/AuthContext";
import AsyncState from "@/components/AsyncState";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = useMemo(() => searchParams.get("token")?.trim() || "", [searchParams]);

  const { isAuthenticated, isVerified, isAdmin, confirmVerification, resendVerification } = useAuth();

  const [isConfirming, setIsConfirming] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function runConfirm() {
      if (!tokenFromUrl) {
        return;
      }

      setIsConfirming(true);
      setErrorMessage(null);
      setInfoMessage(null);

      try {
        const response = await confirmVerification(tokenFromUrl);
        if (cancelled) {
          return;
        }

        if (response?.success) {
          setInfoMessage(response?.data?.message || "Email verified successfully.");
        } else {
          setErrorMessage(response?.error || "Email verification failed.");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Email verification failed.");
        }
      } finally {
        if (!cancelled) {
          setIsConfirming(false);
        }
      }
    }

    runConfirm();

    return () => {
      cancelled = true;
    };
  }, [confirmVerification, tokenFromUrl]);

  async function handleResend() {
    setIsSending(true);
    setErrorMessage(null);

    try {
      const response = await resendVerification();
      if (response?.success) {
        setInfoMessage(response?.data?.message || "Verification email sent.");
      } else {
        setErrorMessage(response?.error || "Failed to send verification email.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to send verification email.");
    } finally {
      setIsSending(false);
    }
  }

  const redirectPath = isAdmin ? "/admin/dashboard" : "/";

  return (
    <section className="relative w-full overflow-hidden">
      <div className="flex flex-col items-stretch gap-10 lg:flex-row lg:gap-16">
        <div className="flex flex-1 justify-center">
          <div className="shadow-auth-panel relative w-full max-w-110 overflow-hidden rounded-[2rem] border border-border-strong bg-surface-dark/80 p-8 backdrop-blur-xl">
            <div className="absolute left-0 top-0 h-1 w-full bg-linear-to-r from-primary via-accent-cyan to-primary opacity-60"></div>

            <div className="mb-8 text-center">
              <h1 className="font-display text-4xl font-bold text-white">Verify your email</h1>
              <p className="mt-2 text-sm text-text-soft">We need a verified account before event details, favorites, and tickets are available.</p>
            </div>

            {isConfirming ? <AsyncState message="Verifying your email..." className="mb-4" /> : null}
            {errorMessage ? <AsyncState type="error" message={errorMessage} className="mb-4" /> : null}
            {infoMessage ? <AsyncState message={infoMessage} className="mb-4" /> : null}

            {isAuthenticated && !isVerified ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={isSending}
                className="group mt-2 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary-strong text-white font-semibold transition-all duration-300 ease-out hover:bg-primary-strong-hover hover:shadow-glow-primary active:translate-y-0"
              >
                <span className="transition-all duration-300 ease-out group-hover:tracking-wide">Resend verification email</span>
                {isSending ? <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span> : null}
              </button>
            ) : null}

            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              {isAuthenticated ? (
                <Link to={redirectPath} className="font-medium text-accent-cyan transition-colors hover:text-accent-purple">
                  Continue
                </Link>
              ) : (
                <>
                  <Link to="/login" className="font-medium text-accent-cyan transition-colors hover:text-accent-purple">
                    Log in
                  </Link>
                  <Link to="/register" className="font-medium text-text-soft transition-colors hover:text-white">
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
