import { useMutation } from "@tanstack/react-query";

import {
  confirmVerificationService,
  forgotPasswordService,
  loginAdminService,
  loginService,
  logoutService,
  resendVerificationService,
  registerService,
  resetPasswordService,
  sendVerificationService,
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

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: async (payload) => resetPasswordService(payload),
  });
}

export function useSendVerificationMutation() {
  return useMutation({
    mutationFn: async (token) => sendVerificationService(token),
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: async (token) => resendVerificationService(token),
  });
}

export function useConfirmVerificationMutation() {
  return useMutation({
    mutationFn: async (token) => confirmVerificationService(token),
  });
}
