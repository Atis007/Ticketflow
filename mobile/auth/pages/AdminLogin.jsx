import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

import AuthForm from "../components/AuthForm";

export default function AdminLoginPage() {
  const navigation = useNavigation();

  return (
    <View className="flex-1 justify-center px-6 py-12">
        <View className="bg-slate-800/80 rounded-3xl p-6 border border-white/10">
          <View className="mb-6 items-center">
            <Text className="font-semibold text-white text-center">
              If you are not here as an admin, please go to
            </Text>
            <View className="flex-row mt-2">
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text className="text-white underline">Login</Text>
              </TouchableOpacity>
              <Text className="mx-2 text-slate-400">or</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text className="text-white underline">Register</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="h-1 bg-purple-600/60 rounded-full mb-6" />

          <AuthForm
            mode="admin-login"
            headerText="Admin Login"
            labelEmail="Email Address"
            placeholderEmail="Write your Admin email"
            labelPassword="Password"
            placeholderPassword="Enter your Admin password"
            buttonText="Log In"
          />
        </View>
      </View>
  );
}
