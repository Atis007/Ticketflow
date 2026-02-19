import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/context/AuthContext";

const ADMIN_ROLE = "admin";

export default function RequireGuest({ children }) {
  const { isAuthLoading, isAuthenticated, user } = useAuth();

  if (isAuthLoading) {
    return null;
  }

  if (isAuthenticated) {
    const role = typeof user?.role === "string" ? user.role.toLowerCase() : "";
    const redirectPath = role === ADMIN_ROLE ? "/admin/dashboard" : "/";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
