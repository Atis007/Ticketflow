import AuthForm from "../components/AuthForm";
import { Link } from "react-router-dom";

export default function AdminLoginPage() {
  return (
    <section className="relative w-full overflow-hidden">
      <div>
        <div className="flex flex-col items-stretch gap-10 lg:flex-row lg:gap-16">
          <div className="flex flex-1 justify-center">
            <div className="relative w-full max-w-110 overflow-hidden rounded-[2rem] border border-white/10 bg-surface-dark/80 p-8 shadow-[0_25px_80px_rgba(2,6,23,0.7)] backdrop-blur-xl">
              <div className="mb-6 text-center text-slate-300">
                <p className="font-semibold text-white">
                  If you are not here as an admin, please go to
                </p>
                <div className="mt-2">
                  <Link to="/login" className="text-white underline">
                    Login
                  </Link>
                  <span className="mx-1">or</span>
                  <Link to="/register" className="text-white underline">
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
