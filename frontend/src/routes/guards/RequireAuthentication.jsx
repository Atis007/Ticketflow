import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/context/AuthContext";

export default function RequireAuthentication({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
