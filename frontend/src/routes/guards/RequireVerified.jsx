import { Navigate } from "react-router-dom";

import { useAuth } from "@/auth/context/AuthContext";

export default function RequireVerified({ children }) {
  const { isAuthLoading, isAuthenticated, isVerified } = useAuth();

  if (isAuthLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isVerified) {
    return <Navigate to="/verify-email?required=1" replace />;
  }

  return children;
}
