import { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

const RESULT_CONFIG = {
  valid: {
    bg: "bg-emerald-900/40",
    border: "border-emerald-500",
    icon: "check-circle",
    iconColor: "#34d399",
    title: "Valid Entry",
    subtitle: "Ticket accepted",
  },
  already_used: {
    bg: "bg-yellow-900/40",
    border: "border-yellow-500",
    icon: "alert-triangle",
    iconColor: "#fbbf24",
    title: "Already Used",
    subtitle: "This ticket was scanned before",
  },
  invalid: {
    bg: "bg-red-900/40",
    border: "border-red-500",
    icon: "x-circle",
    iconColor: "#f87171",
    title: "Invalid Ticket",
    subtitle: "QR code not recognized",
  },
};

export default function ScanResultScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { result = "invalid", seatLabel, sectionName, eventId } = route.params ?? {};

  const config = RESULT_CONFIG[result] ?? RESULT_CONFIG.invalid;

  // Auto-return to scanner after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate("Scanner", { eventId });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation, eventId]);

  return (
    <View className="flex-1 bg-slate-950 items-center justify-center px-6">
      <View className={`w-full rounded-2xl ${config.bg} border ${config.border} p-8 items-center`}>
        <Feather name={config.icon} size={64} color={config.iconColor} />

        <Text className="text-white text-2xl font-bold mt-4">{config.title}</Text>
        <Text className="text-slate-300 text-sm mt-1">{config.subtitle}</Text>

        {seatLabel || sectionName ? (
          <View className="mt-4 rounded-lg bg-slate-800/60 px-4 py-2">
            <Text className="text-slate-300 text-sm text-center">
              {sectionName ? `${sectionName} · ` : ""}
              {seatLabel ?? ""}
            </Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate("Scanner", { eventId })}
        className="mt-8 h-14 w-full rounded-full bg-indigo-600 items-center justify-center"
        activeOpacity={0.8}
      >
        <Text className="text-white font-semibold text-base">Scan Next</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("CheckInHome")}
        className="mt-3"
      >
        <Text className="text-indigo-400 text-sm">Back to Check-In Home</Text>
      </TouchableOpacity>

      <Text className="mt-4 text-slate-600 text-xs">Returning to scanner in 3s...</Text>
    </View>
  );
}
