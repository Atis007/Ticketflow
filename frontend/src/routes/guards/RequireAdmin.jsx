import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/context/AuthContext";

const ADMIN_ROLE = "admin";

export default function RequireAdmin({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || user?.role !== ADMIN_ROLE) {
    return <Navigate to="/" replace />;
  }

  return children;
}
