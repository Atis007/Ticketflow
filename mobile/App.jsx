import "./global.css";
import { useCallback } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
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

import { AuthProvider } from "./auth/context/AuthContext";
import AuthLayout from "./auth/layouts/AuthLayout.jsx";
import LoginPage from "./auth/pages/LoginPage";
import RegisterPage from "./auth/pages/RegisterPage";
//import AdminLoginPage from "./auth/pages/AdminLogin";
import ForgotPasswordPage from "./auth/pages/ForgotPassword.jsx";
import Home from "./pages/Home.jsx";
import RequireAuthentication from "./guards/RequireAuthentication.jsx";

//import AdminDashboard from "./admin/pages/AdminDashboard.jsx";
// Keep splash screen visible while loading fonts
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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <StatusBar style="light" />
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName="Login"
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
            <Stack.Screen name="Home">
              {() => (
                <RequireAuthentication>
                  <Home />
                </RequireAuthentication>
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </View>
  );
}
