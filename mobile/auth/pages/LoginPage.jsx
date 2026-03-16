import { View, Text } from "react-native";
import { useRoute } from "@react-navigation/native";

import AuthForm from "../components/AuthForm";

export default function LoginPage() {
  const route = useRoute();
  const registered = route.params?.registered;

  return (
    <View className="flex-1 justify-center px-6 py-12">
        <View className="mb-8">
          <Text className="text-3xl font-bold text-white">Welcome back to</Text>
          <Text className="text-4xl font-bold text-purple-500">Ticketflow</Text>
          <Text className="mt-3 text-lg text-slate-300">
            Access the latest events and updates tailored just for you.
          </Text>
        </View>

        <View className="bg-slate-800/80 rounded-3xl p-6 border border-white/10">
          <View className="h-1 bg-purple-600 rounded-full mb-6 opacity-60" />

          {registered && (
            <View className="p-4 mb-4 rounded-lg bg-green-500/20 border border-green-500/50">
              <Text className="text-sm text-green-400">
                Registration successful! Please verify your email, then log in.
              </Text>
            </View>
          )}

          <AuthForm
            mode="login"
            headerText="Log In"
            headerParagraph="Enter your credentials to access your profile, events, and more."
            labelEmail="Email Address"
            placeholderEmail="name@example.com"
            labelPassword="Password"
            placeholderPassword="Enter your password"
            buttonText="Log In"
          />
        </View>
      </View>
  );
}
