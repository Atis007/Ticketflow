import { Navigate } from "react-router-dom";

import { useAuth } from "@/auth/context/AuthContext";

export default function RequireAuth({ children }) {
  const { isAuthLoading, isAuthenticated } = useAuth();

  if (isAuthLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
