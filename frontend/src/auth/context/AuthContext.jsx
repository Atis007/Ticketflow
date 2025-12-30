import { createContext, useContext, useState } from "react";

import {
  loginService,
  registerService,
  loginAdminService,
  forgotPasswordService,
} from "../util/auth.service.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  async function login(credentials) {
    const response = await loginService(credentials);
    const userPayload = response?.data?.user;

    if (response?.success) {
      setIsAuthenticated(true);
      setUser(userPayload);
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
    }

    return response;
  }

  async function forgotPassword(email) {
    await forgotPasswordService(email);
  }

  function logout() {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.clear();
    sessionStorage.clear();
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
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
