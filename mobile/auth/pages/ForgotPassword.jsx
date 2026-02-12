import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";

import AuthForm from "../components/AuthForm";

export default function ForgotPasswordPage() {
  const navigation = useNavigation();

  return (
    <View className="flex-1 justify-center px-6 py-12">
        <View className="bg-slate-800/80 rounded-3xl p-6 border border-white/10">
          <View className="items-center mb-6">
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-slate-700 border border-white/10">
              <MaterialIcons name="vpn-key" size={22} color="#a855f7" />
            </View>
          </View>

          <AuthForm
            mode="forgot-password"
            headerText="Forgot password?"
            headerParagraph="No worries, we'll send you reset instructions."
            labelEmail="Email"
            placeholderEmail="Enter your email"
          />

          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            className="flex-row items-center justify-center gap-2 mt-4"
          >
            <MaterialIcons name="arrow-back" size={18} color="#64748b" />
            <Text className="text-sm font-medium text-slate-400">
              Back to log in
            </Text>
          </TouchableOpacity>
        </View>
      </View>
  );
}
