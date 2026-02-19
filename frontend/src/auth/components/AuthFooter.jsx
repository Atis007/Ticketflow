import { Link } from "react-router-dom";

export default function AuthFooter({ mode }) {
  return (
    <p className="text-center text-sm text-text-soft">
      {mode === "login" && (
        <>
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-accent-cyan transition-colors hover:text-accent-purple"
          >
            Register
          </Link>
        </>
      )}{" "}
      {mode === "register" && (
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-accent-cyan transition-colors hover:text-accent-purple"
          >
            Log in
          </Link>
        </>
      )}
      {mode === "admin-login" && (
        <>
          <b>If you are not here as an admin, please go to</b> <br />
          <Link to="/login" className="text-white underline">
            Login
          </Link>
          {" "}or{" "}
          <Link to="/register" className="text-white underline">
            Register
          </Link>
        </>
      )}
    </p>
  );
}
