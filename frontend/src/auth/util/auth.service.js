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

export async function logoutService(token) {
  return authApi.logout(token);
}

export async function currentUserService(token) {
  return authApi.currentUser(token);
}
