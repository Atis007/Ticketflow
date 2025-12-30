import AuthForm from "../components/AuthForm";
import { Link } from "react-router-dom";

export default function ForgotPasswordPage() {
  return (
    <section className="relative w-full overflow-hidden">
      <div>
        <div className="flex flex-col items-stretch gap-10 lg:flex-row lg:gap-16">
          <div className="flex flex-1 justify-center">
            <div className="relative w-full max-w-110 overflow-hidden rounded-[2rem] border border-white/10 bg-surface-dark/80 p-8 shadow-[0_25px_80px_rgba(2,6,23,0.7)] backdrop-blur-xl">
              <div className="absolute left-0 top-0 h-1 w-full bg-linear-to-r from-[#7c3bed] via-accent-cyan to-[#7c3bed] opacity-60"></div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#7c3bed]/20 blur-[60px] rounded-full pointer-events-none"></div>
              <div className="mb-6 flex items-center justify-center">
                <div
                  className="flex h-12 w-12 items-center justify-center
               rounded-md
               bg-[#2a243d]
               ring-1 ring-white/10"
                >
                  <span
                    className="material-symbols-outlined
                 text-[22px]
                 leading-none
                 translate-y-px
                 text-[#7c3bed]"
                  >
                    key
                  </span>
                </div>
              </div>

              <AuthForm
                mode="forgot-password"
                headerText="Forgot password?"
                headerParagraph="No worries, we'll send you reset instructions."
                labelEmail="Email"
                iconEmail="mail"
                idEmail="admin-email"
                nameEmail="email"
                typeEmail="email"
                placeholderEmail="Enter your email"
                buttonIcon="arrow_forward"
              />
              <Link
                to="/login"
                className="group flex items-center justify-center gap-2 mt-2 text-gray-500 hover:text-gray-900 dark:text-[#a692c8] dark:hover:text-white transition-colors duration-200"
              >
                <span className="material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:-translate-x-1">
                  arrow_back
                </span>
                <span className="text-sm font-medium">Back to log in</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
