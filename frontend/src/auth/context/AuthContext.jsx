/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  useConfirmVerificationMutation,
  useAdminLoginMutation,
  useForgotPasswordMutation,
  useLoginMutation,
  useLogoutMutation,
  useResendVerificationMutation,
  useRegisterMutation,
  useResetPasswordMutation,
  useSendVerificationMutation,
} from "../hooks/useAuthMutations";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { clearStoredAuth, isExpired, readStoredAuth, writeStoredAuth } from "../util/auth.storage.js";

const AuthContext = createContext(null);

function normalizeUser(userPayload, fallbackRole = "") {
  if (!userPayload || typeof userPayload !== "object") {
    return null;
  }

  const resolvedRole = typeof userPayload.role === "string" ? userPayload.role.toLowerCase() : fallbackRole;

  return {
    ...userPayload,
    role: resolvedRole,
  };
}

function createSessionFromResponse(response, fallbackRole = "") {
  const token = typeof response?.data?.token === "string" ? response.data.token : null;
  const expiresAt = typeof response?.data?.expiresAt === "string" ? response.data.expiresAt : null;
  const user = normalizeUser(response?.data?.user, fallbackRole);

  if (!token || !expiresAt || !user) {
    return null;
  }

  return {
    token,
    expiresAt,
    user,
  };
}

function getInitialSession() {
  const stored = readStoredAuth();
  if (!stored) {
    return null;
  }

  if (isExpired(stored.expiresAt)) {
    clearStoredAuth();
    return null;
  }

  return stored;
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(() => getInitialSession());
  const token = session?.token ?? null;

  const loginMutation = useLoginMutation();
  const adminLoginMutation = useAdminLoginMutation();
  const registerMutation = useRegisterMutation();
  const forgotPasswordMutation = useForgotPasswordMutation();
  const resetPasswordMutation = useResetPasswordMutation();
  const sendVerificationMutation = useSendVerificationMutation();
  const resendVerificationMutation = useResendVerificationMutation();
  const confirmVerificationMutation = useConfirmVerificationMutation();
  const logoutMutation = useLogoutMutation();
  const currentUserQuery = useCurrentUser(token);

  useEffect(() => {
    if (!token || !currentUserQuery.isSuccess || !currentUserQuery.data) {
      return;
    }

    const normalized = normalizeUser(currentUserQuery.data, session?.user?.role ?? "");
    if (!normalized) {
      return;
    }

    const userChanged = JSON.stringify(session?.user ?? null) !== JSON.stringify(normalized);
    if (!userChanged) {
      return;
    }

    const nextSession = {
      token: session.token,
      expiresAt: session.expiresAt,
      user: normalized,
    };

    writeStoredAuth(nextSession);
    setSession(nextSession);
  }, [currentUserQuery.data, currentUserQuery.isSuccess, session, token]);

  useEffect(() => {
    if (!token || !currentUserQuery.isError) {
      return;
    }

    clearStoredAuth();
    setSession(null);
  }, [currentUserQuery.isError, token]);

  const login = useCallback(async (credentials) => {
    const response = await loginMutation.mutateAsync(credentials);
    const nextSession = createSessionFromResponse(response, "user");

    if (response?.success && nextSession) {
      writeStoredAuth(nextSession);
      setSession(nextSession);
      queryClient.setQueryData(["auth", "currentUser"], nextSession.user);
    }

    return response;
  }, [loginMutation, queryClient]);

  const register = useCallback(async (data) => {
    return registerMutation.mutateAsync(data);
  }, [registerMutation]);

  const loginAdmin = useCallback(async (credentials) => {
    const response = await adminLoginMutation.mutateAsync(credentials);
    const nextSession = createSessionFromResponse(response, "admin");

    if (response?.success && nextSession) {
      writeStoredAuth(nextSession);
      setSession(nextSession);
      queryClient.setQueryData(["auth", "currentUser"], nextSession.user);
    }

    return response;
  }, [adminLoginMutation, queryClient]);

  const forgotPassword = useCallback(async (email) => {
    await forgotPasswordMutation.mutateAsync(email);
  }, [forgotPasswordMutation]);

  const logout = useCallback(async () => {
    try {
      if (session?.token) {
        await logoutMutation.mutateAsync(session.token);
      }
    } catch {
      // local sign-out continues even if API revoke fails
    } finally {
      clearStoredAuth();
      setSession(null);
      queryClient.removeQueries({ queryKey: ["auth", "currentUser"] });
    }
  }, [logoutMutation, queryClient, session?.token]);

  const resetPassword = useCallback(async (payload) => {
    return resetPasswordMutation.mutateAsync(payload);
  }, [resetPasswordMutation]);

  const sendVerification = useCallback(async () => {
    const token = session?.token ?? null;
    return sendVerificationMutation.mutateAsync(token);
  }, [sendVerificationMutation, session?.token]);

  const resendVerification = useCallback(async () => {
    const token = session?.token ?? null;
    return resendVerificationMutation.mutateAsync(token);
  }, [resendVerificationMutation, session?.token]);

  const updateUser = useCallback((partialUser) => {
    setSession((prev) => {
      if (!prev?.user) return prev;
      const nextUser = { ...prev.user, ...partialUser };
      const nextSession = { ...prev, user: nextUser };
      writeStoredAuth(nextSession);
      return nextSession;
    });
  }, []);

  const confirmVerification = useCallback(async (verificationToken) => {
    const response = await confirmVerificationMutation.mutateAsync(verificationToken);
    const nextSession = createSessionFromResponse(response, "user");

    if (response?.success && nextSession) {
      writeStoredAuth(nextSession);
      setSession(nextSession);
      queryClient.setQueryData(["auth", "currentUser"], nextSession.user);
    }

    return response;
  }, [confirmVerificationMutation, queryClient]);

  const value = useMemo(() => {
    const user = session?.user ?? null;
    const hasValidSession = Boolean(session?.token && session?.expiresAt && !isExpired(session.expiresAt));
    const isAuthLoading = hasValidSession && currentUserQuery.isPending;
    const isAuthenticated = Boolean(hasValidSession && user);
    const isAdmin = isAuthenticated && user?.role === "admin";
    const isVerified = Boolean(user?.isVerified);

    return {
      token: session?.token ?? null,
      expiresAt: session?.expiresAt ?? null,
      user,
      isAuthLoading,
      isAuthenticated,
      isAdmin,
      isVerified,
      login,
      loginAdmin,
      register,
      forgotPassword,
      resetPassword,
      sendVerification,
      resendVerification,
      confirmVerification,
      logout,
      updateUser,
    };
  }, [
    confirmVerification,
    currentUserQuery.isPending,
    forgotPassword,
    login,
    loginAdmin,
    logout,
    register,
    resendVerification,
    resetPassword,
    sendVerification,
    session,
    updateUser,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
