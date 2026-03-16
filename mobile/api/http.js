import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";
import { navigationRef } from "../navigationRef";

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL || "";

const http = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "X-Platform": "mobile",
    Host: "ticketflow-local",
  },
});

http.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    const payload = response.data;

    if (payload && payload.success === false) {
      const error = new Error(payload.error || "Request failed");
      error.status = response.status;
      error.details = payload;
      throw error;
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, "data")) {
      return payload.data;
    }

    return payload;
  },
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(["auth_token", "auth_user"]);

      if (navigationRef.isReady()) {
        navigationRef.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: "Login" }] })
        );
      }
    }

    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Network error";
    const httpError = new Error(message);
    httpError.status = error.response?.status;
    httpError.details = error.response?.data;
    return Promise.reject(httpError);
  }
);

export default http;
