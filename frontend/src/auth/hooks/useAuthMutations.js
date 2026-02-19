import { useMutation } from "@tanstack/react-query";

import {
  forgotPasswordService,
  loginAdminService,
  loginService,
  logoutService,
  registerService,
} from "../util/auth.service";

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (credentials) => loginService(credentials),
  });
}

export function useAdminLoginMutation() {
  return useMutation({
    mutationFn: async (credentials) => loginAdminService(credentials),
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: async (payload) => registerService(payload),
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: async (email) => forgotPasswordService(email),
  });
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async (token) => logoutService(token),
  });
}
