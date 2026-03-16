import "./global.css";
import { useCallback, useEffect } from "react";
import { View } from "react-native";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  Unbounded_400Regular,
  Unbounded_600SemiBold,
  Unbounded_700Bold,
  Unbounded_900Black,
} from "@expo-google-fonts/unbounded";
import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import {
  SplineSans_300Light,
  SplineSans_400Regular,
  SplineSans_500Medium,
  SplineSans_600SemiBold,
  SplineSans_700Bold,
} from "@expo-google-fonts/spline-sans";

import { queryClient } from "./query/queryClient";
import { navigationRef } from "./navigationRef";
import { AuthProvider } from "./auth/context/AuthContext";
import AuthLayout from "./auth/layouts/AuthLayout.jsx";
import LoginPage from "./auth/pages/LoginPage";
import RegisterPage from "./auth/pages/RegisterPage";
import ForgotPasswordPage from "./auth/pages/ForgotPassword.jsx";
import RequireAuthentication from "./guards/RequireAuthentication.jsx";
import BottomTabNavigator from "./components/BottomTabNavigator.jsx";
import EventDetailScreen from "./pages/EventDetailScreen.jsx";
import SeatSelectionScreen from "./pages/SeatSelectionScreen.jsx";
import ReservationScreen from "./pages/ReservationScreen.jsx";
import PaymentScreen from "./pages/PaymentScreen.jsx";
import EntryModeScreen from "./pages/EntryModeScreen.jsx";
import CheckInHomeScreen from "./pages/checkin/CheckInHomeScreen.jsx";
import ScannerScreen from "./pages/checkin/ScannerScreen.jsx";
import ScanResultScreen from "./pages/checkin/ScanResultScreen.jsx";
import SyncStatusScreen from "./pages/checkin/SyncStatusScreen.jsx";
import FavoritesScreen from "./pages/FavoritesScreen.jsx";
import ArchiveScreen from "./pages/ArchiveScreen.jsx";

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    Unbounded_400Regular,
    Unbounded_600SemiBold,
    Unbounded_700Bold,
    Unbounded_900Black,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    SplineSans_300Light,
    SplineSans_400Regular,
    SplineSans_500Medium,
    SplineSans_600SemiBold,
    SplineSans_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Handle notification taps for deep linking
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (navigationRef.isReady() && data?.screen) {
        navigationRef.navigate(data.screen, data.params ?? {});
      }
    });

    return () => subscription.remove();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <StatusBar style="light" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
              screenOptions={{ headerShown: false }}
              initialRouteName="MainTabs"
            >
              <Stack.Screen name="Login">
                {() => (
                  <AuthLayout>
                    <LoginPage />
                  </AuthLayout>
                )}
              </Stack.Screen>
              <Stack.Screen name="Register">
                {() => (
                  <AuthLayout>
                    <RegisterPage />
                  </AuthLayout>
                )}
              </Stack.Screen>
              <Stack.Screen name="ForgotPassword">
                {() => (
                  <AuthLayout>
                    <ForgotPasswordPage />
                  </AuthLayout>
                )}
              </Stack.Screen>
              <Stack.Screen name="MainTabs">
                {() => (
                  <RequireAuthentication>
                    <BottomTabNavigator />
                  </RequireAuthentication>
                )}
              </Stack.Screen>
              <Stack.Screen name="EventDetail" component={EventDetailScreen} />
              <Stack.Screen name="SeatSelection" component={SeatSelectionScreen} />
              <Stack.Screen name="Reservation" component={ReservationScreen} />
              <Stack.Screen name="Payment" component={PaymentScreen} />
              <Stack.Screen name="EntryMode" component={EntryModeScreen} />
              <Stack.Screen name="CheckInHome" component={CheckInHomeScreen} />
              <Stack.Screen name="Scanner" component={ScannerScreen} />
              <Stack.Screen name="ScanResult" component={ScanResultScreen} />
              <Stack.Screen name="SyncStatus" component={SyncStatusScreen} />
              <Stack.Screen name="Favorites" component={FavoritesScreen} />
              <Stack.Screen name="Archive" component={ArchiveScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </QueryClientProvider>
    </View>
  );
}
