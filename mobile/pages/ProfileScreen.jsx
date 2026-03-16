import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../auth/context/AuthContext";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  return (
    <View className="flex-1 bg-slate-950 px-6">
      <View className="pt-14 pb-6">
        <Text className="text-2xl font-bold text-white">Profile</Text>
      </View>

      <View className="rounded-xl bg-slate-800 p-5 mb-4">
        {user?.fullName ? (
          <Text className="text-lg font-semibold text-white">{user.fullName}</Text>
        ) : null}
        {user?.email ? (
          <Text className="mt-1 text-sm text-slate-400">{user.email}</Text>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate("MyTickets")}
        className="rounded-xl bg-slate-800 p-4 mb-3 flex-row items-center justify-between"
        activeOpacity={0.8}
      >
        <Text className="text-white font-medium">My Tickets</Text>
        <Text className="text-slate-400">→</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("Favorites")}
        className="rounded-xl bg-slate-800 p-4 mb-3 flex-row items-center justify-between"
        activeOpacity={0.8}
      >
        <Text className="text-white font-medium">Favorites</Text>
        <Text className="text-slate-400">→</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("Archive")}
        className="rounded-xl bg-slate-800 p-4 mb-3 flex-row items-center justify-between"
        activeOpacity={0.8}
      >
        <Text className="text-white font-medium">Past Events</Text>
        <Text className="text-slate-400">→</Text>
      </TouchableOpacity>

      {user?.role === "admin" ? (
        <TouchableOpacity
          onPress={() => navigation.navigate("CheckInHome")}
          className="rounded-xl bg-slate-800 p-4 mb-3 flex-row items-center justify-between"
          activeOpacity={0.8}
        >
          <Text className="text-white font-medium">Check-In Mode</Text>
          <Text className="text-slate-400">→</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        onPress={logout}
        className="mt-4 h-12 w-full rounded-full bg-red-600 items-center justify-center"
        activeOpacity={0.8}
      >
        <Text className="text-white font-semibold">Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}
