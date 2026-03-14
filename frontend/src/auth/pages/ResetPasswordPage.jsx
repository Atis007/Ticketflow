import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "@/auth/context/AuthContext";
import AsyncState from "@/components/AsyncState";

function validateResetForm(password, passwordConfirmation, token) {
  if (!token) {
    return "Reset token is missing from the link.";
  }

  if (!password || !passwordConfirmation) {
    return "Missing required fields.";
  }

  if (password !== passwordConfirmation) {
    return "Password and confirm password do not match.";
  }

  return null;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() || "", [searchParams]);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") || "");
    const passwordConfirmation = String(formData.get("passwordConfirmation") || "");

    const validationMessage = validateResetForm(password, passwordConfirmation, token);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPassword({
        token,
        password,
        passwordConfirmation,
      });

      if (response?.success) {
        setSuccessMessage(response?.data?.message || "Password reset successful. Please log in.");
        form.reset();
      } else {
        setErrorMessage(response?.error || "Reset password failed.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reset password failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="relative w-full overflow-hidden">
      <div className="flex flex-col items-stretch gap-10 lg:flex-row lg:gap-16">
        <div className="flex flex-1 justify-center">
          <div className="shadow-auth-panel relative w-full max-w-110 overflow-hidden rounded-[2rem] border border-border-strong bg-surface-dark/80 p-8 backdrop-blur-xl">
            <div className="absolute left-0 top-0 h-1 w-full bg-linear-to-r from-primary via-accent-cyan to-primary opacity-60"></div>
            <div className="mb-6 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-contrast ring-1 ring-white/10">
                <span className="material-symbols-outlined translate-y-px text-[22px] leading-none text-primary">lock_reset</span>
              </div>
            </div>

            <div className="mb-8 text-center">
              <h1 className="font-display text-4xl font-bold text-white">Set a new password</h1>
              <p className="mt-2 text-sm text-text-soft">Use a strong password to secure your account.</p>
            </div>

            {errorMessage ? <AsyncState type="error" message={errorMessage} className="mb-4" /> : null}
            {successMessage ? <AsyncState message={successMessage} className="mb-4" /> : null}

            <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-text-soft">New password</span>
                <div className="flex h-11 items-center rounded-lg border border-border-strong bg-background-dark px-3.5 transition-colors focus-within:border-accent-cyan focus-within:ring-1 focus-within:ring-accent-cyan">
                  <span className="material-symbols-outlined text-text-muted-strong">lock</span>
                  <input
                    id="reset-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Enter your new password"
                    className="flex-1 bg-transparent px-3 text-text-bright placeholder:text-text-muted-strong focus:outline-none"
                    required
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-text-soft">Confirm password</span>
                <div className="flex h-11 items-center rounded-lg border border-border-strong bg-background-dark px-3.5 transition-colors focus-within:border-accent-cyan focus-within:ring-1 focus-within:ring-accent-cyan">
                  <span className="material-symbols-outlined text-text-muted-strong">lock</span>
                  <input
                    id="reset-password-confirmation"
                    name="passwordConfirmation"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm your new password"
                    className="flex-1 bg-transparent px-3 text-text-bright placeholder:text-text-muted-strong focus:outline-none"
                    required
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group mt-2 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary-strong text-white font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-out hover:bg-primary-strong-hover hover:shadow-glow-primary active:translate-y-0"
              >
                <span className="transition-[letter-spacing] duration-300 ease-out group-hover:tracking-wide">Reset Password</span>
                {isSubmitting ? <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span> : null}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-center gap-3">
              <Link to="/login" className="text-sm font-medium text-accent-cyan transition-colors hover:text-accent-purple">
                Back to log in
              </Link>
              {successMessage ? (
                <button
                  type="button"
                  className="text-sm font-medium text-text-soft transition-colors hover:text-white"
                  onClick={() => navigate("/login")}
                >
                  Continue
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
