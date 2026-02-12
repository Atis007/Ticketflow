import * as authApi from "./auth.api";

export async function loginService(credentials) {
  try {
    return await authApi.login(credentials);
  } catch (error) {
    return {
      success: false,
      error: error.message || "Network error occurred",
      data: null,
    };
  }
}

export async function registerService(data) {
  try {
    return await authApi.register(data);
  } catch (error) {
    return {
      success: false,
      error: error.message || "Network error occurred",
      data: null,
    };
  }
}

export async function loginAdminService(credentials) {
  try {
    return await authApi.loginAdmin(credentials);
  } catch (error) {
    return {
      success: false,
      error: error.message || "Network error occurred",
      data: null,
    };
  }
}

export async function forgotPasswordService(email) {
  try {
    await authApi.forgotPassword(email);
    return { success: true };
  } catch (error) {
    // Silently fail to prevent email enumeration
    return { success: true };
  }
}
