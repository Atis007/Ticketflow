import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ReservationScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const {
    eventId,
    eventTitle,
    seatIds = [],
    expiresInMinutes = 10,
    totalAmount = 0,
    selectedSeats = [],
  } = route.params ?? {};

  const [secondsLeft, setSecondsLeft] = useState(expiresInMinutes * 60);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) {
      Alert.alert("Reservation Expired", "Your seat reservation has expired.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }
  }, [secondsLeft, navigation]);

  const isExpired = secondsLeft === 0;
  const isUrgent = secondsLeft <= 120;

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-4 pt-14 pb-2 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-indigo-400 text-base">← Back</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-4">
        <Text className="text-2xl font-bold text-white">Your Reservation</Text>
        {eventTitle ? (
          <Text className="mt-1 text-sm text-slate-400">{eventTitle}</Text>
        ) : null}
      </View>

      {/* Countdown */}
      <View className="mx-4 mt-6 rounded-xl bg-slate-800 p-5 items-center">
        <Text className="text-xs text-slate-400 uppercase tracking-wider mb-2">
          Time Remaining
        </Text>
        <Text
          className={`text-4xl font-bold ${
            isExpired ? "text-red-400" : isUrgent ? "text-yellow-400" : "text-white"
          }`}
        >
          {formatTime(secondsLeft)}
        </Text>
      </View>

      {/* Selected seats */}
      <View className="mx-4 mt-4 rounded-xl bg-slate-800 p-4">
        <Text className="text-xs text-slate-400 uppercase tracking-wider mb-3">
          Reserved Seats
        </Text>
        {selectedSeats.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {selectedSeats.map((label, idx) => (
              <View key={idx} className="rounded-lg bg-slate-700 px-3 py-1.5">
                <Text className="text-sm text-white">{label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-sm text-slate-400">
            {seatIds.length} seat{seatIds.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {/* Total */}
      <View className="mx-4 mt-4 rounded-xl bg-slate-800 p-4 flex-row items-center justify-between">
        <Text className="text-white font-semibold text-base">Total</Text>
        <Text className="text-indigo-400 font-bold text-lg">
          RSD {parseFloat(totalAmount).toFixed(2)}
        </Text>
      </View>

      {/* Continue to payment */}
      <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-slate-950">
        <TouchableOpacity
          className={`h-14 rounded-full items-center justify-center ${
            isExpired ? "bg-slate-700" : "bg-indigo-600"
          }`}
          activeOpacity={0.8}
          disabled={isExpired}
          onPress={() =>
            navigation.navigate("Payment", {
              eventId,
              eventTitle,
              seatIds,
              totalAmount,
            })
          }
        >
          <Text className="text-white font-semibold text-base">
            {isExpired ? "Reservation Expired" : "Continue to Payment"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
