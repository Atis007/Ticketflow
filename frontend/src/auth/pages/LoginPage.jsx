import AuthForm from "../components/AuthForm";
import { useSearchParams } from "react-router-dom";

import AsyncState from "@/components/AsyncState";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const resetSent = searchParams.get("reset") === "sent";
  const justRegistered = searchParams.get("registered") === "true";

  return (
    <section className="relative w-full overflow-hidden">
      <div className="pointer-events-none absolute top-[-20%] left-[-10%] h-130 w-130 rounded-full bg-[rgba(var(--color-primary-rgb),0.2)] blur-[170px]"></div>
      <div className="pointer-events-none absolute bottom-[-15%] right-[-5%] h-130 w-130 rounded-full bg-[rgba(var(--color-accent-cyan-rgb),0.14)] blur-[170px]"></div>

      <div className="shadow-auth-shell relative z-10 w-full rounded-[2.5rem] border border-border-strong bg-[rgba(var(--color-surface-ink-rgb),0.85)] px-6 py-8 backdrop-blur-2xl sm:px-10 sm:py-10">
        <div className="flex flex-col items-stretch gap-10 lg:flex-row lg:gap-16">
          <div className="flex flex-1 flex-col justify-center gap-6 text-white">
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              Welcome back to
              <span className="drop-shadow-primary-soft block font-display text-primary">
                Ticketflow
              </span>
            </h1>
            <p className="max-w-xl text-lg text-text-soft">
              Access the latest events and updates tailored just for you.
            </p>
          </div>

            <div className="flex flex-1 justify-center lg:justify-end">
              <div className="shadow-auth-panel relative w-full max-w-110 overflow-hidden rounded-[2rem] border border-border-strong bg-surface-dark/80 p-8 backdrop-blur-xl">
                <div className="absolute left-0 top-0 h-1 w-full bg-linear-to-r from-primary via-accent-cyan to-primary opacity-60"></div>
                {justRegistered ? <AsyncState message="Registration successful! Please check your email to verify your account, then log in." className="mb-4" /> : null}
                {resetSent ? <AsyncState message="If the email exists in our system, password reset instructions were sent." className="mb-4" /> : null}
                <AuthForm
                mode="login"
                headerText="Log In"
                headerParagraph="Enter your credentials to access your profile, events, and more."
                labelEmail="Email Address"
                iconEmail="mail"
                idEmail="login-email"
                nameEmail="email"
                typeEmail="email"
                placeholderEmail="name@example.com"
                labelPassword="Password"
                iconPassword="lock"
                idPassword="login-password"
                namePassword="password"
                placeholderPassword="Enter your password"
                buttonText="Log In"
                buttonIcon="arrow_forward"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
