import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import http from "../api/http";

const PUSH_TOKEN_ID_KEY = "push_token_id";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications() {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  // Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Check if already registered to avoid duplicate POSTs
  const existingId = await AsyncStorage.getItem(PUSH_TOKEN_ID_KEY);
  if (existingId) {
    return token;
  }

  try {
    const result = await http.post("api/push-tokens", {
      token,
      platform: Platform.OS,
    });

    const tokenId = result?.id;
    if (tokenId) {
      await AsyncStorage.setItem(PUSH_TOKEN_ID_KEY, String(tokenId));
    }
  } catch {
    // Non-critical — token registration can be retried on next launch
  }

  return token;
}

export async function unregisterPushToken() {
  const tokenId = await AsyncStorage.getItem(PUSH_TOKEN_ID_KEY);

  if (tokenId) {
    try {
      await http.delete(`api/push-tokens/${tokenId}`);
    } catch {
      // Best-effort deletion
    }
    await AsyncStorage.removeItem(PUSH_TOKEN_ID_KEY);
  }
}
