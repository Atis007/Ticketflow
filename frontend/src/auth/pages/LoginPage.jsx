import AuthForm from "../components/AuthForm";

export default function LoginPage() {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="pointer-events-none absolute top-[-20%] left-[-10%] h-130 w-130 rounded-full bg-[rgba(var(--color-primary-rgb),0.25)] blur-[170px]"></div>
      <div className="pointer-events-none absolute bottom-[-15%] right-[-5%] h-130 w-130 rounded-full bg-[rgba(var(--color-accent-cyan-rgb),0.2)] blur-[170px]"></div>

      <div className="relative z-10 w-full rounded-[2.5rem] border border-white/10 bg-[rgba(var(--color-surface-ink-rgb),0.85)] px-6 py-8 shadow-[0_35px_120px_rgba(var(--color-background-rgb),0.55)] backdrop-blur-2xl sm:px-10 sm:py-10">
        <div className="flex flex-col items-stretch gap-10 lg:flex-row lg:gap-16">
          <div className="flex flex-1 flex-col justify-center gap-6 text-white">
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              Welcome back to
              <span className="block font-display text-primary drop-shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.5)]">
                Ticketflow
              </span>
            </h1>
            <p className="max-w-xl text-lg text-slate-300">
              Access the latest events and updates tailored just for you.
            </p>
          </div>

          <div className="flex flex-1 justify-center lg:justify-end">
            <div className="relative w-full max-w-110 overflow-hidden rounded-[2rem] border border-white/10 bg-surface-dark/80 p-8 shadow-[0_25px_80px_rgba(2,6,23,0.7)] backdrop-blur-xl">
              <div className="absolute left-0 top-0 h-1 w-full bg-linear-to-r from-primary via-accent-cyan to-primary opacity-60"></div>
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
