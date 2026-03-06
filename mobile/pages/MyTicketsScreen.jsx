import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPurchases } from "../api/profile.api";

const STATUS_COLOR = {
  paid: "text-green-400",
  pending: "text-yellow-400",
  failed: "text-red-400",
  cancelled: "text-slate-400",
};

function PurchaseCard({ item }) {
  const statusColor = STATUS_COLOR[item.status] ?? "text-slate-400";
  const amount = parseFloat(item.amount || 0).toFixed(2);

  return (
    <View className="mx-4 mb-3 rounded-xl bg-slate-800 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-white flex-1 mr-2" numberOfLines={1}>
          {item.event_title ?? `Payment #${item.id}`}
        </Text>
        <Text className={`text-xs font-medium uppercase ${statusColor}`}>{item.status}</Text>
      </View>
      <Text className="mt-1 text-sm text-slate-400">
        {item.currency ?? "RSD"} {amount}
      </Text>
      {item.created_at ? (
        <Text className="mt-0.5 text-xs text-slate-500">{item.created_at}</Text>
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
      setPurchases(data?.items ?? data ?? []);
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
