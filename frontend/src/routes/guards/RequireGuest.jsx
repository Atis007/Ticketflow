import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/context/AuthContext";

export default function RequireGuest({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}
