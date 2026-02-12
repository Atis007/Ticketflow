import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import AuthFields from "./AuthFields";
import AuthSocial from "./AuthSocial";
import AuthFooter from "./AuthFooter";

import {
  validateLogin,
  validateRegister,
  EMAIL_REGEX,
} from "../../validation/formValidation";

export default function AuthForm({ mode, ...props }) {
  const [errorMessage, setErrorMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formValues, setFormValues] = useState({
    fullname: "",
    email: "",
    password: "",
    passwordConfirmation: "",
  });

  const navigation = useNavigation();
  const auth = useAuth();

  const handleChangeText = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const validators = {
    login: validateLogin,
    "admin-login": validateLogin,
    register: validateRegister,
    "forgot-password": (credentials) => {
      const email = credentials.email?.trim();

      if (!email) {
        return "Email is required.";
      } else if (!EMAIL_REGEX.test(email)) {
        return "Invalid email format.";
      }
      return null;
    },
  };

  const actions = {
    login: auth.login,
    register: auth.register,
    "admin-login": auth.loginAdmin,
    "forgot-password": auth.forgotPassword,
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    const credentials = formValues;
    const validator = validators[mode];
    const msg = validator ? validator(credentials) : null;

    if (msg) {
      setErrorMessage(msg);
      setIsLoading(false);
      return;
    }

    const action = actions[mode];
    if (!action) {
      setErrorMessage("Invalid action.");
      setIsLoading(false);
      return;
    }

    if (mode === "forgot-password") {
      try {
        await action(credentials.email);
      } finally {
        setIsLoading(false);
        navigation.navigate("Login", { resetSent: true });
      }
      return;
    }

    try {
      const response = await action(credentials);

      if (mode === "admin-login" && response?.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: "AdminDashboard" }],
        });
        return;
      }

      if (response?.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        });
      } else {
        setErrorMessage(response?.error ?? "Authentication failed.");
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (mode === "login" || mode === "admin-login") return "Log In";
    if (mode === "register") return props.buttonText || "Get Started";
    if (mode === "forgot-password") return "Reset Password";
    return "Submit";
  };

  return (
    <View className="gap-6">
      <View className="items-center mb-4">
        <Text className="text-3xl font-bold text-white">{props.headerText}</Text>
        {props.headerParagraph && (
          <Text className="mt-2 text-slate-400 text-center">
            {props.headerParagraph}
          </Text>
        )}
      </View>

      {errorMessage && (
        <View className="p-4 mb-4 rounded-lg bg-red-500/20 border border-red-500/50">
          <Text className="text-sm text-red-400">{errorMessage}</Text>
        </View>
      )}

      <AuthFields
        mode={mode}
        values={formValues}
        onChangeText={handleChangeText}
        {...props}
      />

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isLoading}
        className="mt-2 h-12 rounded-full bg-purple-600 flex-row items-center justify-center gap-2"
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text className="text-white font-bold">{getButtonText()}</Text>
            {mode === "register" && (
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            )}
          </>
        )}
      </TouchableOpacity>

      {mode !== "admin-login" && mode !== "forgot-password" && (
        <>
          <AuthSocial />
          <AuthFooter mode={mode} />
        </>
      )}
    </View>
  );
}
