import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "../auth/context/AuthContext";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <View className="flex-1 items-center justify-center bg-slate-950 px-6">
      <Text className="text-2xl font-bold text-white">Welcome</Text>
      {user?.fullName && (
        <Text className="mt-2 text-slate-300">{user.fullName}</Text>
      )}
      {user?.email && (
        <Text className="mt-1 text-slate-400">{user.email}</Text>
      )}

      <TouchableOpacity
        onPress={logout}
        className="mt-8 h-12 w-full max-w-xs rounded-full bg-red-600 items-center justify-center"
        activeOpacity={0.8}
      >
        <Text className="text-white font-semibold">Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}
