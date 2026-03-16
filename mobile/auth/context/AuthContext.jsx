import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  loginService,
  registerService,
  loginAdminService,
  forgotPasswordService,
} from "../util/auth.service";
import { logout as logoutApi } from "../util/auth.api";
import { registerForPushNotifications, unregisterPushToken } from "../../notifications/pushSetup";

const AuthContext = createContext(null);

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth state on mount
  useEffect(() => {
    loadStoredAuth().then(() => {
      // Register push token for returning users
      registerForPushNotifications().catch(() => {});
    });
  }, []);

  async function loadStoredAuth() {
    try {
      const [token, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (token && storedUser) {
        setIsAuthenticated(true);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load auth state:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveAuthState(token, userData) {
    try {
      const tokenValue = token || "authenticated";
      const items = [[TOKEN_KEY, tokenValue]];

      if (userData) {
        items.push([USER_KEY, JSON.stringify(userData)]);
      }

      await AsyncStorage.multiSet(items);
    } catch (error) {
      console.error("Failed to save auth state:", error);
    }
  }

  async function login(credentials) {
    const response = await loginService(credentials);
    const userPayload = response?.data?.user;

    if (response?.success) {
      setIsAuthenticated(true);
      setUser(userPayload);
      await saveAuthState(response?.data?.token || "authenticated", userPayload);
      registerForPushNotifications().catch(() => {});
    }

    return response;
  }

  async function register(data) {
    return registerService(data);
  }

  async function loginAdmin(credentials) {
    const response = await loginAdminService(credentials);
    const userPayload = response?.data?.user;

    if (response?.success) {
      setIsAuthenticated(true);
      setUser(userPayload);
      await saveAuthState(response?.data?.token || "authenticated", userPayload);
    }

    return response;
  }

  async function forgotPassword(email) {
    await forgotPasswordService(email);
  }

  async function logout() {
    try {
      await unregisterPushToken();
    } catch {
      // best-effort
    }
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        await logoutApi(token);
      }
    } catch {
      // ignore — revoke is best-effort
    }
    setIsAuthenticated(false);
    setUser(null);
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    } catch (error) {
      console.error("Failed to clear auth state:", error);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoading,
        login,
        loginAdmin,
        register,
        forgotPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
