import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/context/AuthContext";

export default function RequireAdmin({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}
