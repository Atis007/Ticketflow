import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import AuthFields from "./AuthFields";
import AuthSocial from "./AuthSocial";
import AuthFooter from "./AuthFooter";

import {
  validateLogin,
  validateRegister,
  EMAIL_REGEX,
} from "@/utils/validation/formValidation";

export default function AuthForm({ mode, ...props }) {
  const [errorMessage, setErrorMessage] = useState(null);

  const navigate = useNavigate();
  const auth = useAuth();

  const validators = {
    login: validateLogin,
    "admin-login": validateLogin,
    register: validateRegister,
    "forgot-password": (credentials) => {
      const email = credentials.email?.trim();

      if (!email) {
        return "Email is required.";
      } else if (!EMAIL_REGEX.test(email)) {
        return "Invalid email format.";
      }
      return null;
    },
  };

  // Determine action based on mode.
  const actions = {
    login: auth.login,
    register: auth.register,
    "admin-login": auth.loginAdmin,
    "forgot-password": auth.forgotPassword,
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.target);
    const credentials = Object.fromEntries(formData.entries());

    const validator = validators[mode];
    let msg = validator ? validator(credentials) : null;

    if (msg) {
      setErrorMessage(msg);
      return;
    }

    const action = actions[mode];
    if (!action) {
      setErrorMessage("Invalid action.");
      return;
    }

    // Always navigate to /login?reset=sent after forgot password attempt, regardless of success.
    if (mode === "forgot-password") {
      try {
        await action(credentials.email);
      } finally {
        navigate("/login?reset=sent");
      }
      return;
    }

    // any other action will follow normal flow
    try {
      const response = await action(credentials);

      if (mode === "admin-login" && response?.success) {
        navigate("/admin/dashboard");
        return;
      }

      if (response?.success) {
        navigate("/");
      } else {
        setErrorMessage(response?.error ?? "Authentication failed.");
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again.");
    }
  };

  return (
    <>
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl font-bold text-white">
          {props.headerText}
        </h1>
        {props.headerParagraph && (
          <p className="mt-2 text-slate-400">{props.headerParagraph}</p>
        )}
      </div>
      <form
        method="post"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        {errorMessage !== null && (
          <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 border border-red-200">
            {errorMessage}
          </div>
        )}
        <AuthFields mode={mode} {...props} />

        <button
          type="submit"
          className="mt-2 h-12 rounded-full bg-[#7c3bed] text-white font-bold flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 ease-out
    transform hover:-translate-y-0.5
    hover:shadow-[0_0_30px_rgba(124,59,237,0.55)]
    active:translate-y-0
    group"
        >
          {mode === "login" && (
            <span className="transition-all duration-300 ease-out group-hover:tracking-wide">
              Log In
            </span>
          )}

          {mode === "register" && (
            <>
              <span className="transition-all duration-300 ease-out group-hover:tracking-wide">
                {props.buttonText}
              </span>
              <span className="material-symbols-outlined text-xl transition-transform duration-300 ease-out group-hover:translate-x-1">
                {props.buttonIcon}
              </span>
            </>
          )}

          {mode === "admin-login" && (
            <span className="transition-all duration-300 ease-out group-hover:tracking-wide">
              Log In
            </span>
          )}

          {mode === "forgot-password" && (
            <span className="transition-all duration-300 ease-out group-hover:tracking-wide">
              Reset Password
            </span>
          )}
        </button>

        {mode !== "admin-login" && mode !== "forgot-password" && (
          <>
            <AuthSocial />
            <AuthFooter mode={mode} />
          </>
        )}
      </form>
    </>
  );
}
