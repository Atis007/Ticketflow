import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRoute, useNavigation, CommonActions } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import * as Haptics from "expo-haptics";
import { createPayment, confirmPayment } from "../api/payments.api";
import { eventsKeys } from "../api/events.queryKeys";

function generateIdempotencyKey() {
  // Simple UUID v4 fallback for React Native
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function PaymentScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { eventId, eventTitle, seatIds = [], totalAmount = 0 } = route.params ?? {};

  const [payment, setPayment] = useState(null);
  const [initError, setInitError] = useState(null);

  const initMutation = useMutation({
    mutationFn: () =>
      createPayment({
        eventId,
        seatIds: seatIds.length > 0 ? seatIds : undefined,
        quantity: seatIds.length > 0 ? undefined : 1,
        currency: "RSD",
        idempotencyKey: generateIdempotencyKey(),
      }),
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmPayment(payment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.seats(eventId) });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });

      Alert.alert("Payment Confirmed", "Your tickets are ready!", [
        {
          text: "View Tickets",
          onPress: () =>
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "MainTabs", params: { screen: "MyTickets" } }],
              })
            ),
        },
      ]);
    },
    onError: (err) => {
      Alert.alert("Confirmation Failed", err.message || "Please try again.");
    },
  });

  // Initiate payment on mount
  useEffect(() => {
    if (payment || initMutation.isPending || initError) return;

    initMutation
      .mutateAsync()
      .then((result) => setPayment(result))
      .catch((err) => setInitError(err.message || "Failed to create payment"));
  }, []);

  if (initMutation.isPending && !payment) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="mt-4 text-slate-400">Creating payment...</Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 px-6">
        <Text className="text-center text-red-400 mb-4">{initError}</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="rounded-lg bg-slate-700 px-6 py-3"
        >
          <Text className="text-white font-medium">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!payment) return null;

  const qrPayload = payment.ipsQrPayload ?? payment.ips_qr_payload;

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-4 pt-14 pb-2 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-indigo-400 text-base">← Back</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-4 items-center">
        <Text className="text-2xl font-bold text-white">Payment</Text>
        {eventTitle ? (
          <Text className="mt-1 text-sm text-slate-400">{eventTitle}</Text>
        ) : null}
      </View>

      {/* Amount */}
      <View className="mx-4 mt-6 rounded-xl bg-slate-800 p-4 flex-row items-center justify-between">
        <Text className="text-white font-semibold text-base">Total</Text>
        <Text className="text-indigo-400 font-bold text-lg">
          {payment.currency ?? "RSD"} {parseFloat(payment.amount ?? totalAmount).toFixed(2)}
        </Text>
      </View>

      {/* QR Code */}
      {qrPayload ? (
        <View className="mx-4 mt-6 rounded-xl bg-white p-6 items-center">
          <Text className="text-slate-600 text-xs mb-4 text-center">
            Scan with your banking app to pay via NBS IPS
          </Text>
          <QRCode value={qrPayload} size={220} />
        </View>
      ) : (
        <View className="mx-4 mt-6 rounded-xl bg-slate-800 p-6 items-center">
          <Text className="text-slate-400 text-sm text-center">
            Payment #{payment.id} created. Confirm once paid.
          </Text>
        </View>
      )}

      {/* Confirm button */}
      <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-slate-950">
        <TouchableOpacity
          className={`h-14 rounded-full items-center justify-center ${
            confirmMutation.isPending ? "bg-slate-700" : "bg-emerald-600"
          }`}
          activeOpacity={0.8}
          disabled={confirmMutation.isPending}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            confirmMutation.mutate();
          }}
        >
          <Text className="text-white font-semibold text-base">
            {confirmMutation.isPending ? "Confirming..." : "I've Paid"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
