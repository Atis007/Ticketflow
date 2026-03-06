import * as authApi from "./auth.api.js";

export async function loginService(credentials) {
  return authApi.login(credentials);
}
export async function registerService(data) {
  return authApi.register(data);
}
export async function loginAdminService(credentials) {
  return authApi.loginAdmin(credentials);
}
export async function forgotPasswordService(email) {
  return authApi.forgotPassword(email);
}

export async function resetPasswordService(payload) {
  return authApi.resetPassword(payload);
}

export async function sendVerificationService(token) {
  return authApi.sendVerification(token);
}

export async function resendVerificationService(token) {
  return authApi.resendVerification(token);
}

export async function confirmVerificationService(token) {
  return authApi.confirmVerification(token);
}

export async function logoutService(token) {
  return authApi.logout(token);
}

export async function currentUserService(token) {
  return authApi.currentUser(token);
}
