import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/context/AuthContext";

const ADMIN_ROLE = "admin";

export default function RequireAdmin({ children }) {
  const { isAuthLoading, isAuthenticated, isAdmin, user } = useAuth();

  if (isAuthLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin-login" replace />;
  }

  const normalizedRole = typeof user?.role === "string" ? user.role.toLowerCase() : "";
  if (!isAdmin && normalizedRole !== ADMIN_ROLE) {
    return <Navigate to="/" replace />;
  }

  return children;
}
