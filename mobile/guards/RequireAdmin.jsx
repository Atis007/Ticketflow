import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../auth/context/AuthContext";

const ADMIN_ROLE = "admin";

export default function RequireAdmin({ children }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== ADMIN_ROLE)) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    }
  }, [isAuthenticated, user, isLoading, navigation]);

  if (isLoading) return null;
  if (!isAuthenticated || user?.role !== ADMIN_ROLE) return null;

  return children;
}
