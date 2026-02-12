import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../auth/context/AuthContext";

export default function RequireGuest({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    }
  }, [isAuthenticated, isLoading, navigation]);

  if (isLoading) return null;
  if (isAuthenticated) return null;

  return children;
}
