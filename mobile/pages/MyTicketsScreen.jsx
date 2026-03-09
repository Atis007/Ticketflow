import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import QRCode from "react-native-qrcode-svg";
import { getPurchases } from "../api/profile.api";

const STATUS_COLOR = {
  paid: "text-green-400",
  pending: "text-yellow-400",
  failed: "text-red-400",
  cancelled: "text-slate-400",
};

function TicketQr({ qrCode }) {
  return (
    <View className="mt-3 items-center gap-2">
      <View className="rounded-xl bg-white p-3">
        <QRCode value={qrCode} size={140} />
      </View>
      <Text className="text-[10px] text-slate-500 text-center px-2" numberOfLines={2}>
        {qrCode}
      </Text>
    </View>
  );
}

function PurchaseCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = STATUS_COLOR[item.status] ?? "text-slate-400";
  const amount = parseFloat(item.amount || 0).toFixed(2);
  const hasPaidTickets = item.status === "paid" && Array.isArray(item.tickets) && item.tickets.length > 0;

  return (
    <View className="mx-4 mb-3 rounded-xl bg-slate-800 p-4">
      <Pressable onPress={() => hasPaidTickets && setExpanded((v) => !v)}>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-white flex-1 mr-2" numberOfLines={1}>
            {item.eventName ?? `Payment #${item.id}`}
          </Text>
          <Text className={`text-xs font-medium uppercase ${statusColor}`}>{item.status}</Text>
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-sm text-slate-400">
            {item.currency ?? "RSD"} {amount}
          </Text>
          {hasPaidTickets ? (
            <Text className="text-xs text-indigo-400">
              {item.tickets.length} ticket{item.tickets.length !== 1 ? "s" : ""} · {expanded ? "hide" : "show"} QR
            </Text>
          ) : null}
        </View>
        {item.eventDate ? (
          <Text className="mt-0.5 text-xs text-slate-500">{item.eventDate}</Text>
        ) : null}
      </Pressable>

      {expanded && hasPaidTickets ? (
        <View className="mt-2 border-t border-slate-700 pt-3 gap-4">
          {item.tickets.map((ticket, idx) => (
            <View key={ticket.id} className="items-center">
              <Text className="text-xs text-slate-400 mb-1">Ticket #{idx + 1}</Text>
              <TicketQr qrCode={ticket.qrCode} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function MyTicketsScreen() {
  const [purchases, setPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchPurchases = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) throw new Error("Not authenticated");

      const data = await getPurchases(token);
      setPurchases(data?.purchases ?? data?.items ?? data ?? []);
    } catch (err) {
      setError(err.message || "Failed to load purchases");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-4 pt-14 pb-4">
        <Text className="text-2xl font-bold text-white">My Tickets</Text>
      </View>

      {error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-slate-400">{error}</Text>
        </View>
      ) : (
        <FlatList
          data={purchases}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <PurchaseCard item={item} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchPurchases(true)}
              tintColor="#6366f1"
            />
          }
          ListEmptyComponent={
            <View className="mt-20 items-center">
              <Text className="text-slate-400">You have no tickets yet.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}
