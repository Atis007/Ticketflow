import { Link } from "react-router-dom";

import { useAuth } from "@/auth/context/AuthContext";

export default function LandingPage() {
  const { isAuthenticated, isVerified, user } = useAuth();

  const paragraphText = isAuthenticated
    ? "Ready to discover your next experience?"
    : "Discover the best experiences in your city. Everything in one place, available with a single click.";

  return (
    <div className="max-w-7xl mx-auto w-full pt-6 sm:pt-10 lg:pt-14">
      <div className="flex flex-col items-center justify-center text-center gap-10 max-w-4xl mx-auto">
        {isAuthenticated && !isVerified ? (
          <div className="w-full rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm text-text-soft">
            <p>Email verification is required for event details, favorites, and purchases.</p>
            <Link to="/verify-email" className="mt-2 inline-block font-semibold text-primary hover:text-accent-cyan transition-colors">
              Verify email
            </Link>
          </div>
        ) : null}

        <div className="flex flex-col gap-6 items-center">
          <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl leading-[1.1] tracking-tight text-text-bright">
            {isAuthenticated ? (
              user?.fullname ? (
                `Welcome back, ${user.fullname}`
              ) : (
                "Welcome back!"
              )
            ) : (
              <>
                Tickets Quickly, Smoothly, Reliably.
                <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-accent-cyan via-accent-purple to-danger">
                  Your Journey Starts Here.
                </span>
              </>
            )}
          </h1>
          <p className="text-lg text-text-soft max-w-2xl font-body leading-relaxed font-light">
            {paragraphText}
          </p>
        </div>
      </div>
    </div>
  );
}
