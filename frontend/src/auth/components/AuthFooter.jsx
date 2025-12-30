import { Link } from "react-router-dom";

export default function AuthFooter({ mode }) {
  return (
    <p className="text-center text-sm text-slate-400">
      {mode === "login" && (
        <>
          Don't have an account?{" "}
          <Link to="/register" className="text-white underline">
            Register
          </Link>
        </>
      )}{" "}
      {mode === "register" && (
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-white underline">
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
