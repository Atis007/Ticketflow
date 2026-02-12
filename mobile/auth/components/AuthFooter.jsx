import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function AuthFooter({ mode }) {
  const navigation = useNavigation();

  return (
    <View className="items-center mt-4">
      {mode === "login" && (
        <Text className="text-sm text-slate-400">
          Don't have an account?{" "}
          <Text
            className="text-white underline"
            onPress={() => navigation.navigate("Register")}
          >
            Register
          </Text>
        </Text>
      )}

      {mode === "register" && (
        <Text className="text-sm text-slate-400">
          Already have an account?{" "}
          <Text
            className="text-white underline"
            onPress={() => navigation.navigate("Login")}
          >
            Log in
          </Text>
        </Text>
      )}

      {mode === "admin-login" && (
        <View className="items-center">
          <Text className="text-sm text-slate-400 font-bold text-center">
            If you are not here as an admin, please go to
          </Text>
          <View className="flex-row mt-2">
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text className="text-white underline">Login</Text>
            </TouchableOpacity>
            <Text className="text-slate-400 mx-1">or</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text className="text-white underline">Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
