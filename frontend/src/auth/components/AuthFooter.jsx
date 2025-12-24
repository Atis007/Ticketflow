import { Link } from "react-router-dom";

export default function AuthFooter({ mode }) {
  return (
    <p className="text-center text-sm text-slate-400">
      {mode === "login" ? (
        <>
          Don't have an account?{" "}
          <Link to="/register" className="text-white underline">
            Register
          </Link>
        </>
      ) : (
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-white underline">
            Log in
          </Link>
        </>
      )}
    </p>
  );
}
