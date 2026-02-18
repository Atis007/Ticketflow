import AuthForm from "../components/AuthForm";
import { Link } from "react-router-dom";

export default function AdminLoginPage() {
  return (
    <section className="relative w-full overflow-hidden">
      <div>
        <div className="flex flex-col items-stretch gap-10 lg:flex-row lg:gap-16">
          <div className="flex flex-1 justify-center">
            <div className="shadow-auth-panel relative w-full max-w-110 overflow-hidden rounded-[2rem] border border-border-strong bg-surface-dark/80 p-8 backdrop-blur-xl">
              <div className="mb-6 text-center text-text-soft">
                <p className="font-semibold text-white">
                  If you are not here as an admin, please go to
                </p>
                <div className="mt-2">
                  <Link
                    to="/login"
                    className="font-medium text-accent-cyan transition-colors hover:text-accent-purple"
                  >
                    Login
                  </Link>
                  <span className="mx-1">or</span>
                  <Link
                    to="/register"
                    className="font-medium text-accent-cyan transition-colors hover:text-accent-purple"
                  >
                    Register
                  </Link>
                </div>
              </div>

              <div className="absolute left-0 top-0 h-1 w-full bg-linear-to-r from-primary via-accent-cyan to-primary opacity-60"></div>
              <AuthForm
                mode="admin-login"
                headerText="Admin Login"
                labelEmail="Email Address"
                iconEmail="mail"
                idEmail="admin-email"
                nameEmail="email"
                typeEmail="email"
                placeholderEmail="Write your Admin email"
                labelPassword="Password"
                iconPassword="lock"
                idPassword="admin-password"
                namePassword="password"
                placeholderPassword="Enter your Admin password"
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
